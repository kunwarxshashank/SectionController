from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import torch

BASE_MODEL = "Qwen/Qwen2.5-0.5B"
LORA_PATH = "./qwen_cpu_lora"

# ✅ FORCE OFFLINE MODE
tokenizer = AutoTokenizer.from_pretrained(
    LORA_PATH,
    local_files_only=True
)

base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    local_files_only=True
)

model = PeftModel.from_pretrained(
    base_model,
    LORA_PATH,
    local_files_only=True
)

model.eval()

# ✅ Railway test prompt
prompt = "7*7 = ?"

inputs = tokenizer(prompt, return_tensors="pt")

with torch.no_grad():
    output = model.generate(
        **inputs,
        max_new_tokens=120,
        temperature=0.3
    )

print("\n✅ MODEL OUTPUT:\n")
print(tokenizer.decode(output[0], skip_special_tokens=True))
