const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const ObjectId = require('mongodb').ObjectId;
var MongoClient = require('mongodb').MongoClient;
//const SSLCommerzPayment = require('sslcommerz');
const SSLCommerzPayment = require('sslcommerz-lts')
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
        const bookmarkedMovieCollection = database.collection('bookmarkedMovie');  
        const tvseriesCollection = database.collection('tvseries');  
        const bookmarkedTvseriesCollection = database.collection('bookmarkedTvseries');  
        const usersCollection = database.collection('Users');
        const urlCollection = database.collection('urlholders');  
        console.log('Database Connected')

        app.post('/allusers', async(req, res) => {
          let allUser = null;
          if(superAdminKey === req.body?.adminkey){
            allUser = await usersCollection.find({}).toArray();
            res.json(allUser);
          }else{
            console.log('admin not found')
            res.send(404)
          }
        })

        app.get('/movie', async (req, res) => {
          const cursor = movieCollection.find({})
          const movie = await cursor.toArray()
          res.json(movie)
        })
        
        app.get('/topmovie', async (req, res) => {
          const search = {top:'yes'};
          const cursor = movieCollection.find(search)
          const movie = await cursor.toArray()
          res.json(movie)
        })

        app.get('/moviesearch', async(req, res) => {
          console.log('called')
          const movieid = req.query.bookmark;
          const query = {_id:ObjectId(movieid)};
          const movie = await movieCollection.findOne(query);
          res.json(movie);
        })
        
        app.get('/toptvseries', async (req, res) => {
          const search = {top:'yes'};
          const cursor = tvseriesCollection.find(search)
          const movie = await cursor.toArray()
          res.json(movie)
        })

        app.get('/tvseries', async (req, res) => {
          const cursor = tvseriesCollection.find({})
          const tvseries = await cursor.toArray()
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
          const {email, address, displayName, number } = req.body;
          const newUser = {
            email,
            address,
            displayName,
            number,
          }
          const filter = { email: newUser.email };
          const options = { upsert: true};
          const updateDoc = {$set: newUser};
          const result = await usersCollection.updateOne(filter, updateDoc, options);
          res.json(result)
        })

        app.post('/users', async(req, res) => {
          const {email, displayName, address, number} = req.body;
          const query = {email, displayName, balance: 0, role:'user', address, number: number};
          const cursor = await usersCollection.insertOne(query)
          res.json(cursor)
        })

        app.get('/userdetails', async(req, res) => {
          const email = req.query?.email;
          console.log(req.query);
          console.log('consoling : ', email);
          if(email){
            const filter= { email: email };
            const abcd = email;
            console.log('abcd', abcd);
            console.log(filter);
            const profileData = await usersCollection.findOne(filter);
            res.json(profileData)
          }
        })

        app.post('/addshow', async(req, res) => {
          let addmovie;
          let addtvseries;
          let unqid;
          let urlholder;
          const {show, director, des, cover_img, sub_img_one, sub_img_two, sub_img_three, url, type, img, cost, time, view, ratings, release, genere } = req.body;
          const showdata = { name:show, director, des, cover_img, sub_img_one, sub_img_two, sub_img_three, img, cost, time, view, ratings, release, genere };
          const urldata = {url}
          if(type === 'Movie'){
            addmovie = await movieCollection.insertOne(showdata);
            unqid = ObjectId(addmovie.insertedId).toString()
            urlholder = {unqid, cost, url}
            const respons = await urlCollection.insertOne(urlholder);
            res.json(respons)
          } else if(type === 'TV Series'){
            addtvseries = await tvseriesCollection.insertOne(showdata);
            unqid = ObjectId(addtvseries.insertedId).toString()
            urlholder = {unqid, cost, url}
            const respons = await urlCollection.insertOne(urlholder);
            res.json(respons)
          }
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
                const cost = parseInt(urllink?.cost)
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
        
        app.post('/bookmarks', async(req, res) => {
          const bookmark = req.body;
          console.log(bookmark)
          if(bookmark.show ==='movie'){
            console.log('movie')
            const bookedMovie = await bookmarkedMovieCollection.insertOne(bookmark);
          } 
          else if(bookmark.show === 'tvseries'){
            console.log('tvseries')
            const bookedTvseries = await bookmarkedTvseriesCollection.insertOne(bookmark);
          }
          res.json('Sussessfully added')
        })

        app.get('/bookmarkedmovie', async(req, res) => {
          const search = req.query.booked;
          const filter = {email:search};
          const respons = await bookmarkedMovieCollection.find(filter).toArray();
          console.log(respons);
          let respo = [];
          let i = 0;
          while (i < respons.length) {
            const query = {_id: ObjectId(respons[i].showid)};
            respo[i]  = await movieCollection.findOne(query);
            i++;
          }
          res.json(respo);
        })

        app.get('/bookmarkedseries', async(req, res) => {
          const search = req.query.booked;
          const filter = {email:search};
          const respons = await bookmarkedTvseriesCollection.find(filter).toArray();
          res.json(respons);
        })
        
        //Bangladeshi Payment Getway
        //sslcommerz init

        app.post('/sslinit', async(req, res) => {
          console.log('Initalizing SSLCommerz')
          const data = {
                total_amount: req.body.total_amount,
                currency: 'BDT',
                tran_id: uuidv4(),
                success_url: 'https://api-blockbustershow.onrender.com/sslsuccess',
                // success_url: 'https://aqueous-peak-41377.herokuapp.com/sslsuccess',
                fail_url: 'https://blockbuster-show.web.app/myprofile',
                cancel_url: 'https://blockbuster-show.web.app/myprofile',
                ipn_url: 'https://blockbuster-show.web.app/ipn',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                payment: 'PENDING',
                cus_name: req.body.cus_name,
                cus_email: req.body.cus_email,
                cus_add1: req.body?.cus_add1 || 'Not Provided',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: req.body?.cus_phone || 'Not Provided',
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
          
          const sslcommer = new SSLCommerzPayment(process.env.SSL_KEY_ONE, process.env.SSL_KEY_TWO,false);
          console.log("ssl data : ", sslcommer); 
          sslcommer.init(data).then(paymentdata => {
            res.json(paymentdata.GatewayPageURL)
          });
        })

        app.post('/sslsuccess', async(req, res) => {
          console.log('SSL Success')
          const filter = {email: validuser};
          const cursor = await usersCollection.findOne(filter);
          if(paymentId === cursor.payment.tran_id){
            const  currentBalance = Number(100) + Number(cursor.balance)
            const updateDoc = {'$set': {'payment.payment':'PAID', 'balance':currentBalance}};
            const options = { upsert: true};
            const updateStatus = await usersCollection.updateOne(filter, updateDoc, options)
          } else {
            res.status(400);
          }
          res.status(200).redirect('https://blockbuster-show.web.app/myprofile');
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
