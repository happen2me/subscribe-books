const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const https = require('https');

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
    });

app.post('/', (req, res) => {
    const dc = 'us11';
    const list_id = '82caff5ec9';
    const apikey = '57fb1ae1270fdda2f74319a44bdc7088-us11';
    const url = 'https://' + dc + '.api.mailchimp.com/3.0/lists/' + list_id;

    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;

    const data = {
        members: [
            {
                email_address: email,
                status: 'subscribed',
                merge_fields: {
                    FNAME: firstName,
                    LNAME: lastName
                }
            }
        ]
    };

    const jsonData = JSON.stringify(data);

    const options = {
        method: 'POST',
        auth: 'yuanchun:' + apikey
    };
    
    const request = https.request(url, options, function(response){
        // console.log(JSON.parse(response));
        if(response.statusCode === 200){
            console.log("success")
            try {
                // console.log(JSON.parse(response));
                res.sendFile(__dirname + '/success.html');
            } catch (error) {
                console.log(error);  
                        
            }
        }
        else{
            console.log(response.statusCode);
            res.sendFile(__dirname + '/failure.html');      
        }
    });
    request.write(jsonData);
    request.end();
    // res.sendFile(__dirname + '/index.html');
    });

app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port 3000');
    });