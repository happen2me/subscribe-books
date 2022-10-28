import express from 'express';
import bodyParser from 'body-parser';
import request from 'request';
import https from 'https';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { register_subscriber } from './subscribe.js';

const __dirname = dirname(fileURLToPath(import.meta.url));


const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
    });

app.post('/payload', (req, res) => {
    // push = JSON.parse(req.body);
    // console.log("Got message: " + push);
    // res.send(push)
    console.log('body: ' + req.body.JSON);
    res.json(req.body);
})

app.post('/register', async (req, res) => {
    const dc = 'us11';
    const list_id = '82caff5ec9';
    const apikey = '57fb1ae1270fdda2f74319a44bdc7088-us11';
    const url = 'https://' + dc + '.api.mailchimp.com/3.0/lists/' + list_id;

    const email = req.body.email;

    const data = {
        members: [
            {
                email_address: email,
                status: 'subscribed',
            }
        ]
    };

    const jsonData = JSON.stringify(data);

    const options = {
        method: 'POST',
        auth: 'yuanchun:' + apikey
    };
    
    // const request = https.request(url, options, function(response){
    //     // console.log(JSON.parse(response));
    //     if(response.statusCode === 200){
    //         console.log("success")
    //         try {
    //             // console.log(JSON.stringify(response.body));
    //             res.sendFile(__dirname + '/success.html');
    //         } catch (error) {
    //             console.log(error);  
                        
    //         }
    //     }
    //     else{
    //         console.log('response code: ' + response.statusCode);
    //         res.sendFile(__dirname + '/failure.html');      
    //     }
    // });
    // request.write(jsonData);
    // request.end();
    // res.sendFile(__dirname + '/index.html');

    // try catch on async function
    try {
        const response = await register_subscriber(email);
        res.sendFile(__dirname + '/success.html');
        console.log(Object.keys(response));
    } catch (error) {
        console.log(error.status);
        console.log(error.response.text)
        console.log(Object.keys(error.response));
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
