from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
from peft import LoraConfig, get_peft_model

MODEL = "Qwen/Qwen2.5-3B"

# ✅ Load dataset
dataset = load_dataset("json", data_files="train.json")["train"]

# ✅ Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL)

# ✅ IMPORTANT: Set pad token for Qwen
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# ✅ Tokenization WITH labels (THIS FIXES YOUR ERROR)
def tokenize(example):
    text = f"Instruction:\n{example['instruction']}\n\nResponse:\n{example['output']}"
    tokenized = tokenizer(
        text,
        padding="max_length",
        truncation=True,
        max_length=256
    )
    tokenized["labels"] = tokenized["input_ids"].copy()  # ✅ KEY FIX
    return tokenized

dataset = dataset.map(tokenize)

# ✅ Load model (CPU)
model = AutoModelForCausalLM.from_pretrained(MODEL)
model.config.use_cache = False  # ✅ prevents Trainer warnings

# ✅ LoRA config (CPU safe)
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)

# ✅ Training config (LOW RAM MODE for 8GB)
training_args = TrainingArguments(
    output_dir="./qwen_cpu_lora",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    num_train_epochs=2,
    learning_rate=2e-4,
    logging_steps=10,
    save_steps=200,
    save_total_limit=1,
    report_to="none",
    dataloader_pin_memory=False  # ✅ removes your warning
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset
)

trainer.train()

model.save_pretrained("./qwen_cpu_lora")
tokenizer.save_pretrained("./qwen_cpu_lora")

print("✅ CPU Training Complete!")
