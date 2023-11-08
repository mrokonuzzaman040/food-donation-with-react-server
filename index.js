const express = require('express');
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

console.log();


// middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://food-donation-8087b.web.app',
        'https://food-donation-8087b.firebaseapp.com',
    ],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// connect mongoDB
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.tu0smng.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// middlewares 
const logger = (req, res, next) => {
    console.log('log: info', req.method, req.url);
    next();
}

// Verify Token
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('token in the middleware', token);
    // no token available 
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}


// api functions
async function run() {
    try {
        // await client.connect();
        const foodCollection = client.db('foodDonation').collection('foodCollection');
        const requestCollection = client.db('foodDonation').collection('requestCollection');

        // Auth related api
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            console.log('token', token);

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true });
        })

        // logout api
        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })

        // ------------------- foodCollection related api ------------------- //

        //add foods
        app.post('/foods', async (req, res) => {
            const newFoods = req.body;
            console.log(newFoods);
            const result = await foodCollection.insertOne(newFoods);
            res.send(result);
        })

        //get foods collection
        app.get('/foods', async (req, res) => {
            const cursor = foodCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // update food
        app.patch('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedFood = req.body;
            console.log(updatedFood);
            const updateDoc = {
                $set: {
                    foodName: updatedFood.foodName,
                    foodImage: updatedFood.foodImage,
                    foodQuantity: updatedFood.foodQuantity,
                    foodExdate: updatedFood.foodExdate,
                    foodLocation: updatedFood.foodLocation,
                    addInfo: updatedFood.addInfo,
                },
            };
            const result = await foodCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // delete food
        app.delete('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodCollection.deleteOne(query);
            res.send(result);
        })

        // get food by id
        app.get('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodCollection.findOne(query);
            res.send(result);
        })

        // ------------------- user related api ------------------- //

        // get food by email
        app.get('/userFoods', logger, verifyToken, async (req, res) => {
            console.log(req.query.email);
            console.log('token owner info', req.user)
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await foodCollection.find(query).toArray();
            res.send(result);
        })

        // Food Status update
        app.patch('/userFoods/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedFood = req.body;
            console.log(updatedFood);
            const updateDoc = {
                $set: {
                    foodStatus: updatedFood.foodStatus
                },
            };
            const result = await foodCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // ------------------- orders related api ------------------- // 

        // get orders
        app.get('/orders', async (req, res) => {
            const cursor = requestCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        //add request to user
        app.post('/orders', async (req, res) => {
            const orders = req.body;
            console.log(orders);
            const result = await requestCollection.insertOne(orders);
            res.send(result);
        });

        // update order
        app.patch('user/orders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            console.log(updatedBooking);
            const updateDoc = {
                $set: {
                    reqStatus: updatedBooking.status
                },
            };
            const result = await requestCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //delete order
        app.delete('/user/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await requestCollection.deleteOne(query);
            res.send(result);
        })

        // get orders 
        app.get('/user/orders', verifyToken, logger, async (req, res) => {
            console.log(req.query.email);
            console.log('token owner info', req.user)
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await requestCollection.find(query).toArray();
            res.send(result);
        })

        // ------------------- featured foods related api ------------------- //

        
        // get 6 foods sorted by foodExdate
        app.get('/featuredFoods', async (req, res) => {
            const cursor = foodCollection.find().sort({ foodExdate: 1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('foodServer is running')
})

app.listen(port, () => {
    console.log(`Car foodServer Server is running on port ${port}`)
})