import express from 'express';
import bodyParser from 'body-parser';
import request from 'request';
import https from 'https';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { register_subscriber, get_subscriber_detail, update_subscribed_books, update_subscribed_format } from './subscribe.js';

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

app.post('/register', async (req, res) => {
    const email = req.body.email;
    // try catch on async function
    try {
        const response = await register_subscriber(email);
        if (response.status == 400) {
            // the subscriber already exist, make a toast that redirects to subscription page
            console.log("Subscriber already exist, redirecting to subscription page");
        }
        else {
            // make a toast that the registration is successful
            console.log("Subscriber registered successfully");
        }
        // redirect to subscription page
        const subscriber_detail = await get_subscriber_detail(email);
        // console.log('subscriber_detail');
        // console.log(subscriber_detail);
        res.render("list", {
            email_address: subscriber_detail.email_address,
            booksAvailable: books_available,
            booksSubscribed: subscriber_detail.subscribed_books,
            pageTitle: 'Subscription',
            formats: formats_available,
            selectedFormat: subscriber_detail.format});

    } catch (error) {
        console.log(error);
        res.sendFile(__dirname + '/failure.html');
    }
    
});

app.post('/update', async (req, res) => {
    // it has keys email_address, subscribed_books, format, previous(subscribed_books, format)
    const bodyData = req.body;
    const subscribed_books = bodyData.subscribed_books;
    const subscribed_format = bodyData.format.trim();
    const email_address = bodyData.email_address;
    const previous_format = bodyData.previous.format;
    const previous_subscribed_books = bodyData.previous.subscribed_books;
    if (previous_format !== subscribed_format) {
        // async function
        let response = await update_subscribed_format(email_address, subscribed_format);
        // log response status
        console.log("update_subscribed_format response: " + response.merge_fields.FORMAT);
    }
    // async function
    let updated_note = await update_subscribed_books(email_address, subscribed_books);
    console.log("update_subscribed_books response: " + updated_note.note);
    res.render('index', {pageTitle: 'Sign Up'});
    });


let port = process.env.PORT || 4567;
app.listen(port, () => {
    console.log('Server is running on ' + port);
    });
