const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const ObjectId = require('mongodb').ObjectId;
var MongoClient = require('mongodb').MongoClient;
const SSLCommerzPayment = require('sslcommerz');
const { v4: uuidv4 } = require('uuid');
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.c1ygv.mongodb.net:27017,cluster0-shard-00-01.c1ygv.mongodb.net:27017,cluster0-shard-00-02.c1ygv.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-10o2xl-shard-0&authSource=admin&retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let paymentId = null;
let validuser = null;
const superAdminKey = `${process.env.SUPER_ADMIN_KEY}`;

async function server() {
    try{
        await client.connect();
        const database = client.db('Blockbuster_Show');                         // Database Name
        const movieCollection = database.collection('movie');  
        const tvseriesCollection = database.collection('tvseries');  
        const usersCollection = database.collection('Users');
        const urlCollection = database.collection('urlholders');  
        console.log('Database Connected')

        app.post('/allusers', async(req, res) => {
          console.log('api hit')
          console.log(req.body)
        })

        app.get('/movie', async (req, res) => {
          const limit = parseInt(8);
          const cursor = movieCollection.find({})
          const movie = await cursor.limit(limit).toArray()
          res.json(movie)
        })
        
        app.get('/topmovie', async (req, res) => {
          const search = {top:'yes'};
          const cursor = movieCollection.find(search)
          const movie = await cursor.toArray()
          res.json(movie)
        })
        
        app.get('/toptvseries', async (req, res) => {
          const search = {top:'yes'};
          const cursor = tvseriesCollection.find(search)
          const movie = await cursor.toArray()
          res.json(movie)
        })

        app.get('/tvseries', async (req, res) => {
          const limit = parseInt(8);
          const cursor = tvseriesCollection.find({})
          const tvseries = await cursor.limit(limit).toArray()
          res.json(tvseries)
        })

        app.get('/genere', async(req, res) => {
            const genere = req.query.genere;
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
            let cursor = {};
            let count;

            if(genere === 'ALL'){
              cursor = movieCollection.find({});
              count = await cursor.count()
            } else {
              const search = {genere:genere};
              cursor = movieCollection.find(search);
              count = await cursor.count()
            }

            if(page >= 0){
              movie = await cursor.skip(page*limit).limit(limit).toArray();
            } else {
              movie = await cursor.toArray()
            }
            res.json({
              movie,
              count
            })
        })

        app.get('/watchmovie/:id', async(req, res) => {
          const id = req.params.id;
          const query = {_id: ObjectId(id)}
          const movie = await movieCollection.findOne(query)
          res.json(movie)
        })

        app.get('/watchtvseries/:id', async(req, res) => {
          const id = req.params.id;
          const query = {_id: ObjectId(id)}
          const movie = await tvseriesCollection.findOne(query)
          res.json(movie)
        })

        app.put('/users', async(req, res) => {
          const user = req.body;
          const filter = { email: user.email };
          const options = { upsert: true};
          const updateDoc = {$set: user};
          const result = await usersCollection.updateOne(filter, updateDoc, options);
          res.json(result)
        })

        app.get('/users', async(req, res) => {
          const email = req.query.email;
          const query = { email: email };
          const profileData = await usersCollection.findOne(query)
          res.json(profileData)
        })

        app.put('/view', async(req, res) => {
          let result;
          let urllink;
          const request = req.body;
          const options = { upsert: true};
          if(request.email){
            const filter = {email:request.email}
            const cursor = await usersCollection.findOne(filter);
            const query = {unqid:request.watchid}
            if(request.uid === cursor.payment.tran_id){
              const balance = cursor?.balance;
              if(balance){
                urllink = await urlCollection.findOne(query)
                const cost = parseInt(urllink.cost)
                if(cost){
                  const newBalance = balance - cost;
                  const updateDoc = {$set: { 'balance':newBalance}};
                  const livesession = await usersCollection.updateOne(filter, updateDoc, options)
                }
              }
            } else{
              console.log('Something Went Wrong')
            }
          }
          res.json(urllink)
        })
        
        //Bangladeshi Payment Getway
        //sslcommerz init

        app.post('/sslinit', async(req, res) => {
          const data = {
                total_amount: req.body.total_amount,
                currency: 'BDT',
                tran_id: uuidv4(),
                success_url: 'http://localhost:5000/sslsuccess',
                fail_url: 'http://localhost:3000/myprofile',
                cancel_url: 'http://localhost:3000/myprofile',
                ipn_url: 'http://yoursite.com/ipn',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                payment: 'PENDING',
                cus_name: req.body.cus_name,
                cus_email: req.body.cus_email,
                cus_add1: req.body?.cus_add1,
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: req.body?.cus_phone,
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
                multi_card_name: 'mastercard',
                value_a: 'ref001_A',
                value_b: 'ref002_B',
                value_c: 'ref003_C',
                value_d: 'ref004_D'
          };
          paymentId = data.tran_id;
          validuser = data.cus_email;

          const filter = { email: req.body.cus_email };
          const options = { upsert: true};
          const updateDoc = {$set: {payment:data}};
          const paymentDetails = await usersCollection.updateOne(filter, updateDoc, options);
          
          const sslcommer = new SSLCommerzPayment(process.env.SSL_KEY_ONE, process.env.SSL_KEY_TWO,false) 
          sslcommer.init(data).then(paymentdata => {
            res.json(paymentdata.GatewayPageURL)
          });
        })

        app.post('/sslsuccess', async(req, res) => {
          const filter = {email: validuser};
          const cursor = await usersCollection.findOne(filter);
          if(paymentId === cursor.payment.tran_id){
            const  currentBalance = Number(100) + Number(cursor.balance)
            const updateDoc = {'$set': {'payment.payment':'PAID', 'balance':currentBalance}};
            const options = { upsert: true};
            const updateStatus = await usersCollection.updateOne(filter, updateDoc, options)
          } else {
            res.status(400)
          }
          res.status(200).redirect('http://localhost:3000/myprofile')
        })

    }
    finally{
        // await client.close();
    }
}


server().catch(console.dir)

app.get('/', (req, res) => {
  res.send(`API Rinning On Port : ${port}`)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
