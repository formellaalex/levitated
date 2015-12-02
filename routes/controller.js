"use strict";
var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');
var statusInfo = {success : true};
var errorInfo = {};

function updateNote(note,id, next){

	var query = "UPDATE NOTES SET ";
	for(var field in note){
		if(note[field].match(/^([a-zA-Z0-9 _-]+)$/i)){
			query = query + field + "='" + note[field] + "',";
		}
		else{
			return next("Invalid field variable. SQLITE3 ERROR: ", "400 - Bad request");
		}
	}
	query = query.slice(0, query.length-1);
	var update = db.prepare(query + " WHERE ID = ?");
	update.run(id, function(err) {
		if(err) return next("Invalid ID. SQLITE3 ERROR: " + err);
		db.all("SELECT * FROM NOTES WHERE ID= ?", id, function(err, selectRes){
			if(err) return next(err.toString());
			else return next(null,selectRes);
			
		});	
	});
}


function deleteNote(id, next){
	var delete_q = db.prepare("DELETE FROM NOTES WHERE ID = ?");
 	
	delete_q.run(id, function(err) {
		if(err) return next("Invalid ID. SQLITE3 ERROR: " + err);
		return next(null,statusInfo);
			
	});
}

function sendResponse(object,req,res, status){
	if("format" in req.query){
		if(req.query.format === "jsonp"){
			res.status(status);
			res.jsonp(object);
		}
		else{
			res.status(400);
			res.send("Unsupported format!");
		}
	}
	else{
		res.status(status);
		res.json(object);
	}
}
//IMPORTANT! SQLITE3 for node.js don't handle errors (for example "OUT OF RANGE") so this function is not working properly
function checkError(err,req,res){
	errorInfo.message = err.code;
	errorInfo.code = err.errno;
	if(err.errno === 25 || err.errno === 16 || err.errno === 1){
		sendResponse("404 - Not Found \n" + errorInfo,req,res,404);
	}
	else{
		sendResponse("500 - Internal Server Error \n" + errorInfo,req,res,500);
	}
}	


db.serialize(function() {
  	db.run("CREATE TABLE IF NOT EXISTS NOTES (ID INTEGER PRIMARY KEY AUTOINCREMENT, TITLE TEXT, MESSAGE TEXT, CREATE_DATE DATETIME DEFAULT CURRENT_TIMESTAMP, MODIFY_DATE DATETIME)");
});

router.get('/:version/ping', function(req,res){
    sendResponse({"pong": true},req, res,200);
});

router.get('/:version/notes', function(req,res){

	db.all("SELECT * FROM NOTES", function(err, selectRes){
		if(err) sendResponse(err.toString(),req, res, 400);
		else{
			var responseArray = {};
			responseArray.count = selectRes.length;
			responseArray.results = selectRes;
			sendResponse(responseArray,req, res,200);
		} 
	});
});


router.get('/:version/notes/:id', function(req,res){
	db.all("SELECT * FROM NOTES WHERE ID=?",req.params.id, function(err, selectRes){
		if(err) sendResponse(err.toString(),req, res,400);
		else sendResponse(selectRes,req, res,200);
	});
});

router.post('/:version/notes/', function(req,res){
	if(!req.query.title || !req.query.message){
		sendResponse("404 - Not Found \n Invalid parameters in query string.",req, res,404);
	}
	else{
		var note = [req.query.title, req.query.message, new Date().toJSON().slice(0,10), new Date().toJSON().slice(0,10)];
		db.run("INSERT INTO NOTES(TITLE, MESSAGE, CREATE_DATE, MODIFY_DATE) VALUES(?,?,?,?)",note);
		sendResponse(note, req,res,200);
	}
	
});

router.put('/:version/notes/:id', function(req,res){
	var note = {};
	if(req.query.title){
		note.TITLE = req.query.title;
	}
	if(req.query.message){
		note.MESSAGE = req.query.message;
	}
	note.MODIFY_DATE = new Date().toJSON().slice(0,10);
	updateNote(note,req.params.id, function(err, updateResult){
		if(err) checkError(err,req,res); // sqlite3 can't handle these errors.
		else sendResponse(updateResult,req,res,200);
	});

});


router.delete('/:version/notes/:id', function(req,res){
	var id = req.params.id;
	deleteNote(id, function(err, deleteResult){
		if(err) checkError(err,req,res); // sqlite3 can't handle these errors.
		else sendResponse(deleteResult,req,res,200);
	});

});

module.exports = router;
