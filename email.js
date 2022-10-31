import path from 'path';
import nodemailer from 'nodemailer';
import { update_note, get_subscribers_detail } from './subscribe.js';

/**
 * Required env variables:
 * YANDEX_EMAIL
 * YANDEX_PASSWORD
 */


// Set up transporter with yandex.com
let transporter = nodemailer.createTransport({
    host: "smtp.yandex.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.YANDEX_EMAIL, // generated ethereal user
        pass: process.env.YANDEX_PASSWORD, // generated ethereal password
    }, 
});

transporter.verify(function (error, success) {
    if (error) {
        console.log(error);
        console.log("Email account is not properly set up");
    } else {
        console.log("Server is ready to take our messages");
    }
});


function email_file(transporter, file_path, email){
    const book_name = path.basename(file_path);
    transporter.sendMail({
        from: process.env.YANDEX_EMAIL,
        to: email,
        subject: book_name + " from Bookmailer",
        text: book_name + " is attached.",
        attachments: [
            {
                filename: book_name,
                path: file_path,
            },
        ],
    }, function (err, data) {
        if (err) {
            console.log("Error: " + err);
        } else {
            console.log("Email successfully sent to " + email);
        }
    }
    );
}

/**
 * Email books to subscribers if the book is subscribed and the latest episode is
 * not sent yet.
 * @param {list(dict)} subscriber_list each element is a dictionary with keys: {id: str,
 * email_address: str, status: str, note_id: number, subscribed_books: list,
 * sent_books: dict}
 * @param {list(dict)} newest_books each element is a dictionary {book_name: book_path}

 */
async function email_to_subscribers(subscriber_list, newest_books){
    for (const subscriber of subscriber_list) {
        const subscribed_books = subscriber.subscribed_books;
        const kindle_email = subscriber.email_address;
        let last_sent_books = subscriber.sent_books;
        let has_sent_books = false;
        for (const book_name of subscribed_books) {
            if (book_name in newest_books){
                const latest_episode_path = newest_books[book_name];
                const latest_episode_name = path.basename(latest_episode_path);
                // check whether the book is already sent
                if (book_name in last_sent_books && 
                    last_sent_books[book_name] == latest_episode_name){
                    // the book has already been sent
                    console.log(latest_episode_name + " has already been sent");
                }
                else{
                    // send the book
                    console.log("Book name: " + book_name);
                    email_file(transporter, latest_episode_path, kindle_email)
                    last_sent_books[book_name] = latest_episode_name;
                    has_sent_books = true;
                    console.log("has sent books: " + has_sent_books);
                }
            }
            else{
                // this shouldn't happen
                console.log("Error: an unknown book " + book_name + " is requested")
            }
        }
        // TODO: log to the database
        if (has_sent_books){
            let new_note = {subscribed_books: subscribed_books, sent_books: last_sent_books};
            console.log("Updated note:");
            console.log(new_note);
            update_note(subscriber.id, subscriber.note_id, new_note);
        }
    };
}

export { email_to_subscribers };

// Test email_to_subscribers
// const subscriber_list = await get_subscribers_detail();
// await email_to_subscribers(subscriber_list, {"new_yorker": "./TheEconomist.2022.10.22.epub"});