var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');
var ping = {pong: true};
var statusInfo = {success : true};
var errorInfo = {};
var pong = {"pong": true};



function updateNote(note, next){
	var update = db.prepare("UPDATE NOTES SET TITLE = ?, MESSAGE = ?, MODIFY_DATE = ? WHERE ID = ?");
 
	update.run(note.title, note.message, note.createDate, note.id, function(err) {
		if(err) return next("Invalid ID. SQLITE3 ERROR: " + err);
		return next(null,note);
			
	});
}


function deleteNote(id, next){
	var update = db.prepare("DELETE FROM NOTES WHERE ID = ?");
 
	update.run(id, function(err) {
		if(err) return next("Invalid ID. SQLITE3 ERROR: " + err);
		return next(null,statusInfo);
			
	});
}

function sendResponse(object,req,res){
	if("format" in req.query){
		if(req.query.format == "jsonp"){
			res.jsonp(object);
		}
		else{
			res.send("Unsupported format!");
		}
	}
	else{
		res.json(object);
	}
}
//IMPORTANT! SQLITE3 for node.js don't handle errors (for example "OUT OF RANGE") so this function is not working properly
function checkError(err,req,res){
	errorInfo.message = err.code;
	errorInfo.code = err.errno;
	if(err.errno === 25 || err.errno === 16 || err.errno === 1){
		sendResponse("404 - Not Found \n" + errorInfo,req,res);
	}
	else{
		sendResponse("500 - Internal Server Error \n" + errorInfo,req,res);
	}
}	


db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS NOTES (ID INTEGER PRIMARY KEY AUTOINCREMENT, TITLE TEXT, MESSAGE TEXT, CREATE_DATE DATETIME DEFAULT CURRENT_TIMESTAMP, MODIFY_DATE DATETIME)");
});

router.get('/v1/ping', function(req,res){
    sendResponse(pong,req, res);
});

router.get('/v1/notes', function(req,res){
	db.all("SELECT * FROM NOTES", function(err, selectRes){
		if(err) sendResponse(error.toString(),req, res);
		else sendResponse(selectRes,req, res);
	});
});


router.get('/v1/notes/:id', function(req,res){
	db.all("SELECT * FROM NOTES WHERE ID=" + req.params.id, function(err, selectRes){
		if(err) sendResponse(error.toString(),req, res);
		else sendResponse(selectRes,req, res);
	});
});

router.post('/v1/notes/', function(req,res){
	var note = [req.query.title, req.query.message, new Date().toJSON().slice(0,10), new Date().toJSON().slice(0,10)];
	db.run("INSERT INTO NOTES(TITLE, MESSAGE, CREATE_DATE, MODIFY_DATE) VALUES(?,?,?,?)",note);
	sendResponse(note, req,res);
});

router.put('/v1/notes/:id', function(req,res){
	var note = {id:req.params.id,title: req.query.title, message: req.query.message, createDate: new Date().toJSON().slice(0,10)};
	updateNote(note, function(err, updateResult){
		if(err) checkError(err,req,res); // sqlite3 can't handle these errors.
		else sendResponse(updateResult,req,res);
	});

});


router.delete('/v1/notes/:id', function(req,res){
	var id = req.params.id;
	deleteNote(id, function(err, deleteResult){
		if(err) checkError(err,req,res); // sqlite3 can't handle these errors.
		else sendResponse(deleteResult,req,res);
	});

});

module.exports = router;
