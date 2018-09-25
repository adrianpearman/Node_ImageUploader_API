// Imported Modules
const fs = require('fs')
const express = require('express')
const app = express()
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const multer = require('multer')
const gridFSStorage = require('multer-gridfs-storage')
const grid = require('gridfs-stream')
const methodOverride = require('method-override')
const bodyParser = require('body-parser')

// Initialized App Variables
const data = require('./config.json')
const PORT = data.PORT
const MONGO_URI = data.MONGO_URI
const MONGO_COLLECTION = data.MONGO_COLLECTION
let gfs

app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(methodOverride('_method'))

// MONGO_URI
const conn = mongoose.createConnection(MONGO_URI)

// Initialize gfs
conn.once('open', () => {
  gfs = grid(conn.db, mongoose.mongo)
  gfs.collection(MONGO_COLLECTION)
})

// Creating storage connection
const storage  = new gridFSStorage({
  url: MONGO_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if(err){
          return reject(err)
        }
        const filename = buf.toString('hex') + path.extname(file.originalname)
        const fileInfo = {
          filename: filename,
          bucketName: MONGO_COLLECTION
        }
        resolve(fileInfo)
      })
    })
  }
})

const upload = multer ({ storage })


// Routes
app.get('/', (req, res) => {
  // res.render('index')
  gfs.files.find().toArray((err, files) => {
    // Checks for errors
    if (err) {
      return error
    }

    if (!files || files.length === 0) {
      res.render('index', { files: false })
    }else{
      files.map(file => {
        if (file.contentType === 'image/jpeg' || file.contentType === 'img/png'){
          file.isImage = true
        }else{
          file.isImage = false
        }
      })
      res.render('index', { files: files })
    }

    // return res.json(files)
  })
})

// Return all files in JSON
app.get('/files', (req, res)=> {
  gfs.files.find().toArray((err, files) => {
    // Checks for errors
    if(err){
      return error
    }

    if(!files || files.length === 0){
      return res.status(404).json({
        error: 'No files exist'
      })
    }

    return res.json(files)
  })
})

// Grabs a Single JSON File Object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    // Checks for errors
    if (err) {
      return error
    }

    if (!file || file.length === 0) {
      return res.status(404).json({
        error: 'No file exist'
      })
    }

    return res.json(file)
  })
})

// Grabs single image 
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Checks for errors
    if (err) {
      return error
    }

    // Validates whether the name matches 
    if (!file || file.length === 0) {
      return res.status(404).json({
        error: 'No file exist'
      })
    }

    if(file.contentType === 'image/jpeg' || file.contentType === 'img/png'){
      const readstream = gfs.createReadStream(file.filename)
      readstream.pipe(res)
    }else{
      res.status(404).json({
        error: 'No image exists'
      })
    }

    // return res.json(file)
  })
})

// POST
// Upolads the image to the database
app.post('/upload', upload.single('file'), (req, res) => {
  // res.json({ file: req.file})
  res.redirect('/')
})

// DELETE
// Delete record from database using the item _:id
app.delete('/files/:id', (req, res) => {
  gfs.remove({
    _id: req.params.id, root: MONGO_COLLECTION
  }, (err, gridStore) => {
    if(err){
      return res.status(404).json({error})
    }

    res.redirect('/')
  })
})

app.listen(PORT, () => {
  console.log(`Listening on Port; ${PORT}`)
  console.log(data)
})


