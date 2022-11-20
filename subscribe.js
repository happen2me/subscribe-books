import client from '@mailchimp/mailchimp_marketing';
import { MD5 } from "md5-js-tools";

/**
 * Required env variables:
 * MAILCHIMP_API_KEY
 * MAILCHIMP_LIST_ID
 * MAILCHIMP_SERVER_PREFIX
 */
const dc = process.env.MAILCHIMP_SERVER_PREFIX;
const list_id = process.env.MAILCHIMP_LIST_ID;
const apikey = process.env.MAILCHIMP_API_KEY;

client.setConfig({
    apiKey: apikey,
    server: dc,
});

// create a default note for the book
const default_note = {subscribed_books:[], sent_books:{}};

/**
 * This function returns a list of raw subscriber objects
 * @returns a list of subscribers in Chimpmail format
 */
async function get_subscribers(){
    const response = await client.lists.getListMembersInfo(list_id);
    console.log("The list has " + response.members.length + " members");  
    return response.members;  
}

async function get_subscriber(subscriber_hash=null, subscriber_email=null){
    let response = null;
    if (subscriber_hash == null){
        if (subscriber_email == null){
            throw new Error("Must provide either subscriber_hash or subscriber_email");
        }
        subscriber_hash = await get_subscriber_hash(subscriber_email);
    }
    response = await client.lists.getListMember(
        list_id,
        subscriber_hash
    );
    return response;
}

/**
 * Register a new subscriber to the list
 * @param {str} kindle_email 
 * @returns if the subscriber exists, return the error response body. If successfully
 * registered, return the response object. Otherwise, throw an error.
 */
async function register_subscriber(kindle_email){
    // catch bad request
    let response = null;
    try{
        console.log("Registering a new subscriber: " + kindle_email);
        response = await client.lists.addListMember(list_id, {
            email_address: kindle_email,
            status: 'subscribed',
            merge_fields: {
                FORMAT: 'mobi'
            }
        });
        console.log("Subscribed with status code: " + response.status);
    }
    catch(err){
        // if member already exists, inform caller
        // console.log(err)
        if (err.response.body.title == "Member Exists"){
            response = err.response.body;
        }
        // else, throw the error
        else{
            throw err;
        }
    }    
    return response;
}

async function get_subscriber_hash(kindle_email){
    const subscriber_hash = MD5.generate(kindle_email.toLowerCase());
    return subscriber_hash;
}

async function remove_subscriber(kindle_email){
    // first get the subscriber hash
    const subscriber_hash = await get_subscriber_hash(kindle_email);
    console.log("subscriber hash: " + subscriber_hash);
    const response = await client.lists.deleteListMemberPermanent(
        list_id,
        subscriber_hash
    );
    console.log(response === true);
    return true;
}

/**
 * Get a list of notes associated with the subscriber
 * @param {str} subscriber_hash 
 * @returns 
 */
async function get_notes(subscriber_hash){
    const response = await client.lists.getListMemberNotes(
        list_id,
        subscriber_hash
    );
    return response.notes;
}

/**
 * Get the primary note of the subscriber. If there is no notes associated with
 * the subscriber, create a new one and return it.
 * @param {str} subscriber_hash 
 * @returns the primary Mailchimp note of the subscriber
 */
async function get_or_create_primary_note(subscriber_hash){
    let notes = await get_notes(subscriber_hash);
    let note = null;
    if (notes.length == 0){
        // if there is no note, create a new note
        const response = await client.lists.createListMemberNote(
            list_id,
            subscriber_hash,
            {"note": JSON.stringify(default_note)}
        );
        // get the created note id
        note = response;
    }
    else{
        note = notes[0];
    }
    return note;
}

/**
 * This function checks whether a note (note attr of the Mailchimp note)
 * can be parsed as a JSON object. If yes, it further checks whether the
 * object has the subscribed_books and sent_books attributes. If not, it
 * returns the default note.
 * @param {str} note_content A note to be parsed
 * @returns A subscription dict: {subscribed_books:[], sent_books:{}}
 */
function vaidate_and_parse_note(note_content){
    note_content = note_content.replace(/&quot;/g,'"')
    // This function checks whether the note has the key subscribed_books
    // as a list and sent_books as a dictionary
    let note = {};
    try{
        note = JSON.parse(note_content);
    }
    catch(err){
        console.log("Error: the note can't be parsed as a JSON object. Creating a new note");
        note = default_note;
    }
    if (!note.hasOwnProperty('subscribed_books') ||
        !note.hasOwnProperty('sent_books')) {
            console.log("Error: the note doesn't have the required keys. Creating a new note");
        note = default_note;
    }
    return note;
}

/**
 * Update the note of the subscriber
 * @param {str} subscriber_hash 
 * @param {str} note_id 
 * @param {dict} note_content A dict that looks like {subscribed_books:[], sent_books:{}}
 * @returns 
 */
async function update_note(subscriber_hash, note_id, note_content){
    const updated_note = await client.lists.updateListMemberNote(
        list_id,
        subscriber_hash,
        note_id,
        {"note": JSON.stringify(note_content)}
    );
    return updated_note;
}

/**
 * Subscribe a book to the subscriber.
 * It uses the mailchimp notes associated with users as a simple storage.
 * @param {str} kindle_email 
 * @param {str} book_name 
 * @returns 
 */
async function subscribe_book(kindle_email, book_name){
    // check whether there are already notes associated with the user
    const subscriber_hash = await get_subscriber_hash(kindle_email);
    let primary_note = await get_or_create_primary_note(subscriber_hash);
    let note_content = vaidate_and_parse_note(primary_note.note);
    if (!note_content.subscribed_books.includes(book_name)){
        note_content.subscribed_books.push(book_name);
    }
    // Update the note
    const updated_subscribes = update_note(subscriber_hash, primary_note.id, note_content);
    return updated_subscribes;
}

async function unsubscribe_book(kindle_email, book_name){
    // check whether there are already notes associated with the user
    const subscriber_hash = await get_subscriber_hash(kindle_email);
    if (subscriber_hash == ""){
        console.log("Error: the subscriber is not found");
        return;
    }
    let primary_note = await get_or_create_primary_note(subscriber_hash);
    let note_content = vaidate_and_parse_note(primary_note.note);
    // Remove the book from the subscribed_books
    note_content.subscribed_books = note_content.subscribed_books.filter(
        (item) => item !== book_name
    );
    // Update the note
    const updated_subscribes = await update_note(subscriber_hash, primary_note.id, note_content);
    return updated_subscribes;
}


/**
 * Update subscription list of a user
 * @param {str} kindle_email the user to update
 * @param {list} book_names The books to update, it must be a list of strings
 * @returns A Mailchimp note
 */
async function update_subscribed_books(kindle_email, book_names){
    // check whether there are already notes associated with the user
    const subscriber_hash = await get_subscriber_hash(kindle_email);
    let primary_note = await get_or_create_primary_note(subscriber_hash);
    let note_content = vaidate_and_parse_note(primary_note.note);
    // Directly replace the subscribed_books list
    note_content.subscribed_books = book_names;
    // Update the note
    const updated_note = await update_note(subscriber_hash, primary_note.id, note_content);
    return updated_note;
}

async function update_subscribed_format(kindle_email, format){
    const subscriber_hash = await get_subscriber_hash(kindle_email);
    const response = await client.lists.updateListMember(
        list_id,
        subscriber_hash,
        {merge_fields: {FORMAT: format}}
      );
    return response;
}

async function convert_subscriber_detail(subscriber){

    // If there is no last note, create a new note
    let primary_note = null;
    if (!subscriber.hasOwnProperty('last_note')){
        primary_note = await get_or_create_primary_note(subscriber.id);
    }
    else{
        primary_note = subscriber.last_note;
    }
    let subscriber_detail = vaidate_and_parse_note(primary_note.note);
    subscriber_detail.id = subscriber.id;
    subscriber_detail.email_address = subscriber.email_address;
    subscriber_detail.note_id = primary_note.note_id;
    subscriber_detail.status = subscriber.status;
    let format = subscriber.merge_fields.FORMAT;
    if (format == ""){
        format = "mobi";
    }
    subscriber_detail.format = format;
    return subscriber_detail;
}

/**
 * Get the list of subscribers in the following format:
 * {id: str, email_address: str, status: str, note_id: number, subscribed_books: list,
 * sent_books: dict}
 */
async function get_subscribers_detail(){
    const subscribers = await get_subscribers();
    let subscribers_detail = [];
    for (const subscriber of subscribers){
        subscriber_detail = await convert_subscriber_detail(subscriber);
        subscribers_detail.push(subscriber_detail);
    }
    return subscribers_detail;
}

async function get_subscriber_detail(kindle_email=null, subscriber_hash=null){
    let subscriber = null;
    if (subscriber_hash == null){
        if (kindle_email == null){
            console.log("Error: kindle_email and subscriber_hash are both null");
            return;
        }
        // if using email as search key, directly get subscriber from all subscribers
        subscriber = await get_subscriber(null, kindle_email);
    }
    else{
        subscriber = await get_subscriber(subscriber_hash);
    }
    const subscriber_detail = await convert_subscriber_detail(subscriber);
    return subscriber_detail;
}



export {register_subscriber, remove_subscriber, subscribe_book,
    unsubscribe_book, update_subscribed_books, get_subscribers_detail,
    update_note, get_subscriber_detail, update_subscribed_format};

// let data = {
//     user_id: '123',
//     subscribed_books: ['book1', 'book2'],
//     sent_books: {
//         'book1': 'episode1',
//         'book2': 'episode2'
//     }
// }

// let hash = await get_subscriber_hash("y.c@mail.com");
// let notes = await get_notes(hash);
// console.log(notes);

// get the created note
// const response = await client.lists.createListMemberNote(
//     '82caff5ec9',
//     '929e867a50186d25acb96f145d26c9b4',
//     {"note": JSON.stringify({subscribed_books:[], sent_books:{}})}
// );
// console.log(response);

// subscribe_book("y.c@mail.com", "new_yorker")
// const updated = await subscribe_book("y.c@mail.com", 'book3');
// console.log(updated);

// test get_subscribers
// const subscribers = await get_subscribers();
// for(const subscriber of subscribers){
//     console.log(subscriber.email_address);
//     if (subscriber.hasOwnProperty('last_note')){
//         console.log(JSON.parse(subscriber.last_note.note.replace(/&quot;/g,'"')));
//     }
// }


// Test get_subscribers_detail

// const note = await update_subscribed_books("immr.shen@gmail.com", ["economist", "new_yorker"])
// const subscribers_detail = await get_subscribers_detail();
// console.log(subscribers_detail);

// const detail = await get_subscriber_detail("immr.shen@gmail.com")
// console.log(detail);
// // log MD5 hash of the email
// console.log(MD5.generate("immr.shen@gmail.com"));

// test register_subscriber
// const response = await register_subscriber("xyz@xyz.com");
// console.log(response);