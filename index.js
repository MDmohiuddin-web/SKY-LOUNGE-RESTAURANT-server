const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 9585;     

// middleware
 
app.use(cors()); 
app.use(express.json());

// DATA BASE CONNECTION CODE

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.cg8xo0z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,     
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const MenuCollection = client.db("our-restaurant").collection("menu");
    const ReviewCollection = client.db("our-restaurant").collection("reviews");
    const CardCollection = client.db("our-restaurant").collection("Cards");

    // Create a database variable outside of the async function so that we can use it outside of the try/catch block
    app.get("/menu", async (req, res) => {
      const result = await MenuCollection.find().toArray();
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await ReviewCollection.find().toArray();
      res.send(result);
    });

    // cards collections
    app.get("/cards", async (req, res) => {
       
      const result = await CardCollection.find().toArray();
      res.send(result);
       
    });
    
    app.post("/cards", async (req, res) => {  
      const result = await CardCollection.insertOne(req.body);   
      res.send(result);  
    
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("our-restaurant-server is running");
});

app.listen(port, () => {
  console.log(`our-restaurant-server is running on port ${port}`);
});

/**
 * ----------------------
 * naming convention  
 * ----------------------
 * app.get('/user')
 * app.get('/user/:id')
 * app.post('/user')
 * app.put('/user/:id')
 * app.patch('/user/:id')
 * app.delete('/user/:id')
 */
