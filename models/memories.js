const mongoose = require('mongoose');
const Activity = require('./activities');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    fileName: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_50');
});

const opts = { toJSON: { virtuals: true } };

const MemorySchema = new Schema({
    date: String,
    title: String,
    images: [ImageSchema],
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    location: String,
    description: String,
    ianThumbup: {
        type: Boolean,
        default: false
    },
    charzThumbup: {
        type: Boolean,
        default: false
    },
    currentThumbup: {
        type: Boolean,
        default: false
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    activities: [{
        type: Schema.Types.ObjectId,
        ref: 'Activity'
    }]
}, opts);

MemorySchema.virtual('properties.popUpMarkup').get(function () {
    return `
    <strong><a href="/memories/${this._id}">${this.title}</a></strong>
    <p>${this.description.substring(0,20)}...</p>`;
});

MemorySchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Activity.deleteMany({
            _id: {
                $in: doc.activities
            }
        })
    }
})

module.exports = mongoose.model('Memory', MemorySchema);