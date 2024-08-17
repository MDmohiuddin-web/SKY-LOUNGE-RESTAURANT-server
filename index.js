const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe=require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 9585;

// middleware

app.use(cors());
app.use(express.json());

// DATA BASE CONNECTION CODE

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const usersCollection = client.db("our-restaurant").collection("users");
    const ReviewCollection = client.db("our-restaurant").collection("reviews");
    const CardCollection = client.db("our-restaurant").collection("Cards");
    const paymentCollection = client.db("our-restaurant").collection("payments");
    // jwt related code
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    //middlewares

    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access " });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //   //middlewares
    //verify admin after verifytoken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // users collections api
    app.post("/users", async (req, res) => {
      const user = req.body;
      //insert email if user does not exist
      //you can do this many ways (1:email unique, 2: upsert, 3: simple checking,)
      const filter = { email: user.email };
      const existingUser = await usersCollection.findOne(filter);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      // find user by email
      const user = await usersCollection.findOne(query);
      let admin = false;
      // don't forget to check if user is admin or not

      if (user?.role === "admin") {
        // if user is admin then set admin to true
        admin = true;
      }
      res.send({ admin });
    });
    // make admin api
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };

        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // users collections for delete users
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // Create a database variable outside of the async function so that we can use it outside of the try/catch block
    app.get("/menu", async (req, res) => {
      const result = await MenuCollection.find().toArray();
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await MenuCollection.insertOne(item);
      res.send(result);
    });
    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await MenuCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await MenuCollection.findOne(query);
      res.send(result);
    });

    //
    app.patch('/menu/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: (id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }

      const result = await MenuCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    app.get("/reviews", async (req, res) => {
      const result = await ReviewCollection.find().toArray();
      res.send(result);
    });

    // older version of cards collections
    // cards collections
    // app.get("/cards", async (req, res) => {
    //   const email = req.filter.email;
    //   const filter = { email: email };
    //   const result = await CardCollection.find(filter).toArray();
    //   res.send(result);
    // });

    // new version of cards collections
    app.get("/cards", async (req, res) => {
      const email = req.query.email; // Use req.query to access query parameters
      const filter = { email: email };
      const result = await CardCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/cards", async (req, res) => {
      const result = await CardCollection.insertOne(req.body);
      res.send(result);
    });
    app.delete("/cards/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await CardCollection.deleteOne(filter);
      res.send(result);
    });

    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret   
      })
    });

    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })
 

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
