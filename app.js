import express from 'express';
import bodyParser from 'body-parser';
import request from 'request';
import https from 'https';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { register_subscriber, get_subscriber_detail } from './subscribe.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const books_available = {'economist': 'The Economist',
                        'new_yorker': 'New Yorker',
                        'atlantic': 'The Atlantic',
                        'wired': 'Wired',
                        'guardian': 'The Guardian'};
const formats_available = ['mobi', 'epub', 'pdf'];


const app = express();
app.use('/materialize', express.static(__dirname + '/node_modules/materialize-css/dist/'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json())

app.get('/', (req, res) => {
        res.render('index', {pageTitle: 'Sign Up'});
});

app.get('/subscription', (req, res) => {
    res.render("list", {booksAvailable: books_available,
        booksSubscribed: ['economist'],
        pageTitle: 'Subscription',
        formats: ['mobi', 'epub', 'pdf'],
        selectedFormat: 'mobi'});
    });

app.post('/payload', (req, res) => {
    // push = JSON.parse(req.body);
    // console.log("Got message: " + push);
    // res.send(push)
    console.log('body: ' + req.body.JSON);
    res.json(req.body);
})

app.post('/register', async (req, res) => {
    const email = req.body.email;
    // try catch on async function
    try {
        const response = await register_subscriber(email);
        if (response.status == 400) {
            // the subscriber already exist, make a toast that redirects to subscription page

        }
        else {
            // make a toast that the registration is successful
            
        }
        // redirect to subscription page
        const subscriber_detail = await get_subscriber_detail(email);
        console.log('subscriber_detail');
        console.log(subscriber_detail);
        res.render("list", {booksAvailable: books_available,
            booksSubscribed: subscriber_detail.subscribed_books,
            pageTitle: 'Subscription',
            formats: formats_available,
            selectedFormat: 'mobi'});

    } catch (error) {
        console.log(error);
        res.sendFile(__dirname + '/failure.html');
    }
    
});

app.post('/', (req, res) => {
    
    const bodyData = req.body;
    // console.log("body: " + JSON.stringify(bodyData))
    console.log(bodyData);
    res.sendFile(__dirname + '/index.html');
    });

let port = process.env.PORT || 4567;
app.listen(port, () => {
    console.log('Server is running on ' + port);
    });
