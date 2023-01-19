if (process.env.NODE_ENV !== "production") {
    require('dotenv').config()
}

const express = require('express');
const app = express();
const path = require('path');
const Memory = require('./models/memories');
const Activity = require('./models/activities');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const User = require('./models/users');
const passport = require('passport');
const localStrategy = require('passport-local');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const multer = require('multer');
const { storage, cloudinary } = require('./cloudinary');
const upload = multer({ storage });
const MongoDBStore = require('connect-mongo');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/meories';


mongoose.connect(dbUrl);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
// app.use(express.static(path.join(__dirname, 'public')));

const secret = process.env.SECRET || 'thisshouldbeabettersecret';

const store = MongoDBStore.create({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24 * 3600
});

store.on('error', function (e) {
    console.log("session store error!!", e)
})

app.use(session({
    store,
    name: 'blah',
    secret,
    reave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(async (req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    const memories = await Memory.find();
    const randomID = Math.floor(Math.random() * memories.length);
    const browsingMemoryID = memories[randomID]._id;
    res.locals.browsing = browsingMemoryID;
    next();
})

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must login!');
        return res.redirect('/');
    }
    next();
}

const currentTime = () => {
    const today = new Date();
    const date = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    return `${date} ${time}`;
}



app.get('/memories', isLoggedIn, async (req, res) => {
    const memories = await Memory.find();
    const userMemories = await Memory.find({ author: req.user._id });
    const userContribution = userMemories.length;
    res.render('memories/index', { memories, userContribution });
    // res.send({ memories }) 
})

app.post('/memories', isLoggedIn, upload.array('image'), async (req, res) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.memory.location,
        limit: 1
    }).send()
    const langRandom = Math.floor(Math.random() * 19) - 9;
    const latRandom = Math.floor(Math.random() * 19) - 9;
    const memory = new Memory(req.body.memory);
    memory.geometry = geoData.body.features[0].geometry;
    memory.geometry.coordinates[0] = memory.geometry.coordinates[0] + (langRandom / 100);
    memory.geometry.coordinates[1] = memory.geometry.coordinates[1] + (latRandom / 100);
    memory.images = req.files.map(f => ({ url: f.path, fileName: f.filename }));
    memory.author = req.user._id;
    const createDate = currentTime();
    const activity = new Activity({ actDate: createDate, actType: 'Created' });
    activity.actAuthor = req.user._id;
    memory.activities.push(activity);
    await activity.save();
    await memory.save();
    req.flash('success', 'You have made a new Memory!')
    res.redirect(`/memories/${memory._id}`);
})

app.get('/memories/new', isLoggedIn, async (req, res) => {
    const userMemories = await Memory.find({ author: req.user._id });
    const userContribution = userMemories.length;
    res.render('memories/new', { userContribution });
})

app.get('/memories/61bbeba54855f0ca71c9b4ad', isLoggedIn, async (req, res) => {
    const memories = await Memory.find();
    const userMemories = await Memory.find({ author: req.user._id });
    const userContribution = userMemories.length;
    res.render('memories/cm2021', { memories, userContribution });
})

app.get('/memories/6214d50a04683ef42f5a78ae', isLoggedIn, async (req, res) => {
    const memories = await Memory.find();
    const userMemories = await Memory.find({ author: req.user._id });
    const userContribution = userMemories.length;
    res.render('memories/vd2022', { memories, userContribution });
})

app.get('/memories/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const memory = await Memory.findById({ _id: id }).populate({ path: 'activities', populate: { path: 'actAuthor' } }).populate('author');
    const userMemories = await Memory.find({ author: req.user._id });
    const userContribution = userMemories.length;
    res.render('memories/show', { memory, userContribution });
})

app.put('/memories/:id', isLoggedIn, upload.array('image'), async (req, res) => {
    const { id } = req.params;
    const memory = await Memory.findByIdAndUpdate(id, { ...req.body.memory }, { new: true });
    const imgs = req.files.map(f => ({ url: f.path, fileName: f.filename }));
    memory.images.push(...imgs);
    const editeDate = currentTime();
    const activity = new Activity({ actDate: editeDate, actType: 'Edited' });
    activity.actAuthor = req.user._id;
    memory.activities.push(activity);
    await activity.save();
    await memory.save();
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await memory.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    req.flash('success', 'The Memory has been successfully upadted!')
    res.redirect(`/memories/${id}`);
})

app.delete('/memories/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const memory = await Memory.findByIdAndDelete(id);
    req.flash('error', 'The Memory is deleted!')
    res.redirect('/memories');
})

app.get('/memories/:id/edit', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const memory = await Memory.findById({ _id: id });
    const userMemories = await Memory.find({ author: req.user._id });
    const userContribution = userMemories.length;
    res.render('memories/edit', { memory, userContribution });
})

app.post('/memories/:id/thumbups', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const memory = await Memory.findById({ _id: id });
    const editeDate = currentTime();
    const activity = new Activity({ actDate: editeDate });
    if (req.user.username === 'Husband') {
        memory.ianThumbup = !memory.ianThumbup;
        activity.actType = memory.ianThumbup ? 'Thumbuped' : 'Unthumbuped';
        memory.currentThumbup = memory.ianThumbup;
    } else {
        memory.charzThumbup = !memory.charzThumbup;
        activity.actType = memory.charzThumbup ? 'Thumbuped' : 'Unthumbuped';
        memory.currentThumbup = memory.charzThumbup;
    }
    activity.actAuthor = req.user._id;
    memory.activities.push(activity);
    await activity.save();
    await memory.save();
    res.redirect(`/memories/${id}`);
})

app.get('/zxy100121', (req, res) => {
    res.render('users/register');
})

app.post('/zxy100121', async (req, res) => {
    const { username, password } = req.body;
    const user = new User({ username });
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, () => {
        req.flash('success', `Welcome ${user.username}!`);
        res.redirect('/memories');
    })
})


app.post('/login', passport.authenticate('local', { failureFlash: 'Password is incorrect!', failureRedirect: '/login' }),
    function (req, res) {
        // req.flash('success', `Welcome back ${req.user.username}`);
        res.redirect('/memories');
    }
)

app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'See you soon!');
    res.redirect('/');
})

app.get('/test', (req, res) => {
    res.render('memories/test')
})


app.get('/', (req, res) => {
    req.logout();
    res.render('home');
})

const port = process.env.PORT || 3000;
// const port = 3000;
app.listen(port, () => {
    console.log(`serving on port ${port}`)
})