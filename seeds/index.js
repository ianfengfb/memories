const mongoose = require('mongoose');
const Memory = require('../models/memories');

mongoose.connect('mongodb://localhost:27017/memories');
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const seedDB = async () => {
    await Memory.deleteMany({});
    for (i = 23; i < 26; i++) {
        const mem = new Memory({
            date: `1-10-${1989 + i}`,
            title: `${i}th Birthday`,
            images: [
                { url: 'https://res.cloudinary.com/dvmlczwti/image/upload/v1633841476/Memory/zhmq3yatuxe9xqjqoxac.jpg', fileName: 'Memory/zhmq3yatuxe9xqjqoxac' },
                { url: 'https://res.cloudinary.com/dvmlczwti/image/upload/v1633927624/Memory/aldvazpbfhkmewsrwklc.jpg', fileName: 'Memory/aldvazpbfhkmewsrwklc' },
                { url: 'https://res.cloudinary.com/dvmlczwti/image/upload/v1633928149/Memory/fq4mq9qioolvehkgbbce.jpg', fiileName: 'Memory/fq4mq9qioolvehkgbbce' }
            ],
            location: 'Beijing, Beijing',
            description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellendus debitis velit nobis culpa eum aliquid veniam, officiis minima magnam facere sed corrupti aperiam. Explicabo enim cumque dicta voluptatibus ratione veritatis?',
            author: '615fedaca90ec0a26d327d78'
        })
        await mem.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})