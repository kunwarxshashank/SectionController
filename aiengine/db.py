from pymongo import MongoClient

# Connection URI (replace with your own)
uri = "mongodb+srv://ahighrisk:419s0CfKN8EqYffU@eleve.8sr9bfh.mongodb.net/?retryWrites=true&w=majority&appName=eleve"

try:
    client = MongoClient(uri)
    db = client["trainsection"]        # choose a database
    collection = db["test"]         # choose a collection

    print("Connected to MongoDB Atlas!")

    # Example insert
    collection.insert_one({"name": "Alice", "age": 25})

    # Example read
    user = collection.find_one({"name": "Alice"})
    print(user)

except Exception as e:
    print("Error:", e)
