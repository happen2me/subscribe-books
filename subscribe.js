import client from 'mailchimp-marketing';

const dc = 'us11';
const list_id = '82caff5ec9';
const apikey = '57fb1ae1270fdda2f74319a44bdc7088-us11';

client.setConfig({
    apiKey: apikey,
    server: dc,
});

// create a default note for the book
const default_note = {subscribed_books:[], sent_books:{}};

async function get_subscribers(){
    const response = await client.lists.getListMembersInfo(list_id);
    console.log("The list has " + response.members.length + " members");  
    return response.members;  
}

async function register_subscriber(kindle_email){
    const response = await client.lists.addListMember(list_id, {
        email_address: kindle_email,
        status: 'subscribed',
    });
    console.log("Status code: " + response.statusCode);
    console.log(response);
    return response;
}

async function get_subscriber_hash(kindle_email){
    let subscribers = await get_subscribers();
    let subscriber_hash = "";
    for (const subscriber of subscribers) {
        console.log("email:" + subscriber.email_address);
        if (subscriber.email_address == kindle_email){
            subscriber_hash = subscriber.id;
            break;
        }
    }
    return subscriber_hash;
}

async function remove_subscriber(kindle_email){
    // first get the subscriber hash
    const subscriber_hash = await get_subscriber_hash(kindle_email);
    if (subscriber_hash == ""){
        console.log("Error: the subscriber is not found");
    }
    console.log("subscriber hash: " + subscriber_hash);
    const response = await client.lists.deleteListMemberPermanent(
        list_id,
        subscriber_hash
    );
    console.log(response === true);
    return true;
}

async function get_subscribed_books(kindle_email){
    // use the memo as a simple storage
    const subscriber_hash = await get_subscriber_hash(kindle_email);
    if (subscriber_hash == ""){
        console.log("Error: the subscriber is not found");
        return;
    }
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
 * @param {*} note_content 
 * @returns 
 */
function vaidate_and_parse_note(note_content){
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
    if (subscriber_hash == ""){
        console.log("Error: the subscriber is not found");
        return;
    }
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



async function update_subscribed_books(kindle_email, book_names){
    // check whether there are already notes associated with the user
    const subscriber_hash = await get_subscriber_hash(kindle_email);
    if (subscriber_hash == ""){
        console.log("Error: the subscriber is not found");
        return;
    }
    let primary_note = await get_or_create_primary_note(subscriber_hash);
    let note_content = vaidate_and_parse_note(primary_note.note);
    // Directly replace the subscribed_books list
    note_content.subscribed_books = book_names;
    // Update the note
    const updated_note = await update_note(subscriber_hash, primary_note.id, note_content);
    return updated_note;
}

export {get_subscribers, register_subscriber, remove_subscriber, subscribe_book,
    unsubscribe_book, update_subscribed_books};

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