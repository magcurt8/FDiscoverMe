//The server for the project
//source: lectures 11 and 12 to implement the REST API
//source: https://github.com/mapbox/node-sqlite3
//source: http://dalelane.co.uk/blog/?p=3152
//source: http://stackoverflow.com/questions/1748794/is-there-an-arraylist-in-javascript

var express = require('express');
var app = express();
var http = require('http').Server(app);
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database('theDatabase.db');

db.run("CREATE TABLE IF NOT EXISTS peeps (username varchar(20) PRIMARY KEY, password varchar(20), city varchar(20), state varchar(20), country varchar(20), places TEXT, completed TEXT)");
db.run("CREATE TABLE IF NOT EXISTS locate (name varchar(50), type varchar(20), city varchar(20), state varchar(20), country varchar(20), count INTEGER)");


//reqired to support parsing of POST request bodies
var bodyParser = require('body-parser');
app.use(bodyParser.json()); //support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); //support encoded bodies

//put all static files in static_files/ subdirectory
//and the server will serve them from there: e.g.,:
//      http://localhost:3000/test.html
//will send the file static_file/test.html to the user's web browser
app.use(express.static('static_files'));

//Rest API

//post request...create new user
app.post('/users', function(req,res){
	var postBody = req.body;
	var username = postBody.username;
	var password = postBody.password;
	var city = postBody.city;
	var state = postBody.state;
	var country = postBody.country;

	if(!username | !password | !city | !state | !country){
		res.send('BLANK');
		return; //return early
	}

	db.get('SELECT * FROM peeps WHERE username=?', [username], function(err,rows){
		if(err){
			res.send('ERROR');
		} else {
			if(rows === undefined){
				var thePlaces = [];
				var places = JSON.stringify(thePlaces);
				var theCompletes = [];
				var completed = JSON.stringify(theCompletes);
				var stmt = db.prepare("INSERT into peeps VALUES (?,?,?,?,?,?,?)");
				stmt.run(username,password,city,state,country,places,completed);
				stmt.finalize();
				res.send('OK');
			} else {
				res.send('TAKEN');
			}
		}
	});
});

//user get request
app.get('/users/*/*', function(req,res){
	db.get('SELECT * FROM peeps WHERE username=?', req.params[0], function(err,rows){
		if(err){
			res.send({status: "ERROR"});
		} else {
			console.log(rows);
			if(rows === undefined){
				res.send({failedUsername: req.params[0], failedPassword: req.params[1]});
				return;
			}
			if(rows.password === req.params[1]){
				res.send(rows);
			} else {
				res.send({failedUsername: req.params[0], failedPassword: req.params[1]});
			}	
		}
	});
});

app.put('/users/*/*', function(req,res){
	var postBody = req.body;
	var password = postBody.password;
	var city = postBody.city;
	var state = postBody.state;
	var country = postBody.country;

	if(!password | !city | !state | !country){
		res.send('BLANK');
		return; //return early
	}

	db.get('SELECT * FROM peeps WHERE username=?', req.params[0], function(err,rows){
		if(err){
			res.send("ERROR");
		} else {
			console.log(rows);
			if(rows === undefined){
				res.send("IncorrectInfo");
				return;
			}
			if(rows.password === req.params[1]){
				db.run('UPDATE peeps SET password = ?, city = ?, state = ?, country = ? WHERE username = ?', [password,city,state,country,req.params[0]], function(err,rows){
					if(err){
						res.send("ERROR");
					} else {
						res.send("OK");
					}
				});	
			} else {
				res.send("IncorrectInfo");
			}
		}
	});
});

//user delete request
app.delete('/users/*/*', function(req,res){
	db.get('SELECT * FROM peeps WHERE username=?', req.params[0], function(err,rows){
		if(err){
			res.send("ERROR");
		} else {
			console.log(rows);
			if(rows === undefined){
				res.send("IncorrectInfo");
			}
			if(rows.password === req.params[1]){
				db.run('DELETE FROM peeps WHERE username = ?', req.params[0], function(err,rows){
					if(err){
						res.send("ERROR");
					} else {
						res.send("OK");
					}
				});	
			} else {
				res.send("IncorrectInfo");
			}
		}
	});
});

app.post('/places/*/*', function(req,res){
	var postBody = req.body;
	var name = postBody.name;
	var type = postBody.type;
	var city = postBody.city;
	var state = postBody.state;
	var country = postBody.country;

	console.log(name + " " + type + " " + city + " " + state + " " + country);

	if(!name | !type | !city | !state | !country){
		res.send({status:'BLANK'});
	}

	db.get('SELECT * from locate WHERE name=? AND city=? AND state=? AND country=?', [name,city,state,country], function(err,rows){
		if(err){
			res.send({status: 'ERROR'});
		} else {
			//create current count to update the popularity of a location
			var currentCount;
			if(rows === undefined){
				//insert into locate table
				currentCount = 1;
				var stmt = db.prepare("INSERT into locate VALUES (?,?,?,?,?,?)");
				stmt.run(name,type,city,state,country,currentCount);
				stmt.finalize();
			} else {
				currentCount = rows.count +1;
				db.run('UPDATE locate SET count =? WHERE name =? AND city=? AND state=? AND country=?', [currentCount,name,city,state,country], function(err,rows){
					if(err){
						res.send({status: 'ERROR'});
					}
				});	
			}
			
			
			//insert the reference to the locate in the peeps
			db.get('SELECT * from peeps WHERE username=?', req.params[0],function(err,row){
				if(err){
					res.send({status:'MADE ERROR'});
				} else {
					if(row === undefined){
						res.send({status: 'ERROR'});
						return;
					}
					
					var thePlaces = JSON.parse(row.places);
					var theCompletes = JSON.parse(row.completed);

					for(let i = 0; i < thePlaces.length; i++){
						if(thePlaces[i].name === name
						   && thePlaces[i].city === city
						   && thePlaces[i].state === state
						   && thePlaces[i].country === country){
							res.send({status: 'PLACES'});
						}
					}

					for(let i=0; i < theCompletes.length; i++){
						if(theCompletes[i].name === name
						   && theCompletes[i].city === city
						   && theCompletes[i].state === state
						   && theCompletes[i].country === country){
							res.send({status: 'COMPLETED'});
						}
					}

					thePlaces.push({"name": name,
									"type": type,
								    "city": city,
									"state": state,
									"country": country});

					let add = JSON.stringify(thePlaces);

					//console.log(add);

					if(row.password === req.params[1]){
						db.run('UPDATE peeps SET places=? WHERE username=?', [add,req.params[0]], function(err,rows){
							if(err){
								res.send({status:'ERROR'});
							} else {
								db.get('SELECT * FROM peeps WHERE username=?', req.params[0], function(err,rows){
									if(err){
										res.send({status:'MADE ERROR'});
									} else {
										console.log(rows);
										if(rows === undefined){
											res.send({status: 'MADE ERROR'});
											return;
										}
										if(rows.password === req.params[1]){
											console.log(rows);
											res.send(rows);
										} else {
											res.send({status: 'MADE ERROR'});
										}
									}
								}); 
							}
						});
					} else {
						res.send({status: 'ERROR'});
					}
				}
			});
		}
	});
});

app.put('/complete/*/*', function(req,res){
	const postBody = req.body;
  	const name = postBody.name;
  	const type = postBody.type;
  	const city = postBody.city;
  	const state = postBody.state;
  	const country = postBody.country;

	console.log("Passed parameters: " + name + " " + type + " " + city + " " + state + " " + country);

	db.get('SELECT * from peeps WHERE username=?', req.params[0], function(err,rows){
		if(err){
			console.log('first error');
			res.send({status: "ERROR"});
		} else {
			console.log(rows);
			if(rows === undefined){
				console.log('rows undefined');
				res.send({status: "IncorrectInfo"});
				return;
			}
			if(rows.password === req.params[1]){
				var theArray = JSON.parse(rows.places);

				console.log(theArray.length);

				for(var i = 0; i < theArray.length; i++){
					console.log("checking: " + theArray[i].name);
					if(theArray[i].name === name
					   && theArray[i].city === city
					   && theArray[i].state === state
					   && theArray[i].country === country){
						console.log("Splicing: " + theArray[i].name);
						theArray.splice(i,1);
					}
				}

				var returnArray = JSON.stringify(theArray);

				console.log("returnArray");
				console.log(returnArray);

				var completed = JSON.parse(rows.completed);

				completed.push({"name": name,
								"type": type,
								"city": city,
								"state": state,
								"country": country});

				var newComplete = JSON.stringify(completed);

				console.log(newComplete);


				db.run('UPDATE peeps SET places=?, completed=? WHERE username=?', [returnArray,newComplete,req.params[0]], function(err,rows){
					if(err){
						console.log('update error');
						res.send({status:'ERROR'});
					} else {
						db.get('SELECT * FROM peeps WHERE username=?', req.params[0], function(err,rows){
							if(err){
								res.send({status:'ERROR'});
							} else {
								console.log(rows);
								if(rows === undefined){
									res.send({status: 'ERROR'});
								}
								if(rows.password === req.params[1]){
									console.log(rows);
									res.send(rows);
								} else {
									res.send({status: 'ERROR'});
								}
							}
						}); 
					}
				});
			} else {
				console.log('incorrect password');
				res.send({status: "IncorrectInfo"});
			}
		}
	});
});


app.put('/remove/*/*', function(req,res){
	var postBody = req.body;
	var name = postBody.name;
	var type = postBody.type;
	var city = postBody.city;
	var state = postBody.state;
	var country = postBody.country;

	db.get('SELECT * from peeps WHERE username=?', req.params[0], function(err,rows){
		if(err){
			res.send({status: "ERROR"});
			return;
		} else {
			console.log(rows);
			if(rows === undefined){
				res.send({status: "IncorrectInfo"});
				return;
			}
			if(rows.password === req.params[1]){
				var theArray = JSON.parse(rows.places);

				console.log(theArray.length);

				var newArray = [];

				for(var i = 0; i < theArray.length; i++){
					console.log("checking: " + theArray[i].name);
					if(theArray[i].name === name
					   && theArray[i].city === city
					   && theArray[i].state === state
					   && theArray[i].country === country){
						console.log("Splicing: " + theArray[i].name);
						theArray.splice(i,1);
					}
				}

				var returnArray = JSON.stringify(theArray);

				console.log("returnArray");
				console.log(returnArray);


				db.run('UPDATE peeps SET places=? WHERE username=?', [returnArray,req.params[0]], function(err,rows){
					if(err){
						res.send({status:'ERROR'});
					} else {
						db.get('SELECT * FROM peeps WHERE username=?', req.params[0], function(err,rows){
							if(err){
								res.send({status:'ERROR'});
							} else {
								console.log(rows);
								if(rows === undefined){
									res.send({status: 'ERROR'});
								}
								if(rows.password === req.params[1]){
									console.log(rows);
									res.send(rows);
								} else {
									res.send({status: 'ERROR'});
								}
							}
						}); 
					}
				});
			} else {
				res.send({status: "IncorrectInfo"});
			}
		}
	});
});

app.get('/search/name/*', function(req,res){

	console.log("Variable:" + req.params[0]);

	db.all('SELECT * from locate where name=?', req.params[0],function(err,rows){
		if(err){
			res.send({status: 'ERROR'});
		} else {
			if(rows === undefined){
				res.send({status: 'NoResults'});
			} else {
				var theLength = [];
				
				for(var i=0; i < rows.length; i++){
					theLength.push({"name": rows[i].name,
									"type": rows[i].type,
									"city": rows[i].city,
									"state": rows[i].state,
									"country": rows[i].country});
				}

				var theSearch = JSON.stringify(theLength);

				console.log(theSearch);

				res.send(theSearch);
			}
		}
	});
});

app.get('/search/type/*', function(req,res){

	console.log("Variable:" + req.params[0]);

	db.all('SELECT * from locate where type=?', req.params[0],function(err,rows){
		if(err){
			res.send({status: 'ERROR'});
		} else {
			if(rows === undefined){
				res.send({status: 'NoResults'});
			} else {
				var theLength = [];
				
				for(var i=0; i < rows.length; i++){
					theLength.push({"name": rows[i].name,
									"type": rows[i].type,
									"city": rows[i].city,
									"state": rows[i].state,
									"country": rows[i].country});
				}

				var theSearch = JSON.stringify(theLength);

				console.log(theSearch);

				res.send(theSearch);
			}
		}
	});
});

app.get('/search/city/*/*/*', function(req,res){
	db.all('SELECT * from locate where city=? AND state=? AND country=?', [req.params[0],req.params[1],req.params[2]],function(err,rows){
		if(err){
			res.send({status: 'ERROR'});
		} else {
			if(rows === undefined){
				res.send({status: 'NoResults'});
			} else {
				var theLength = [];
				
				for(var i=0; i < rows.length; i++){
					theLength.push({"name": rows[i].name,
									"type": rows[i].type,
									"city": rows[i].city,
									"state": rows[i].state,
									"country": rows[i].country});
				}

				var theSearch = JSON.stringify(theLength);

				console.log(theSearch);

				res.send(theSearch);
			}
		}
	});
});

app.get('/search/state/*/*', function(req,res){
	db.all('SELECT * from locate where state=? AND country=?', [req.params[0],req.params[1]],function(err,rows){
		if(err){
			res.send({status: 'ERROR'});
		} else {
			if(rows === undefined){
				res.send({status: 'NoResults'});
			} else {
				var theLength = [];
				
				for(var i=0; i < rows.length; i++){
					theLength.push({"name": rows[i].name,
									"type": rows[i].type,
									"city": rows[i].city,
									"state": rows[i].state,
									"country": rows[i].country});
				}

				var theSearch = JSON.stringify(theLength);

				console.log(theSearch);

				res.send(theSearch);
			}
		}
	});
});

app.get('/search/country/*', function(req,res){
	db.all('SELECT * from locate where country=?', req.params[0],function(err,rows){
		if(err){
			res.send({status: 'ERROR'});
		} else {
			if(rows === undefined){
				res.send({status: 'NoResults'});
			} else {
				var theLength = [];
				
				for(var i=0; i < rows.length; i++){
					theLength.push({"name": rows[i].name,
									"type": rows[i].type,
									"city": rows[i].city,
									"state": rows[i].state,
									"country": rows[i].country});
				}

				var theSearch = JSON.stringify(theLength);

				console.log(theSearch);

				res.send(theSearch);
			}
		}
	});
});

app.post('/qresults', function(req,res){
	console.log("put quiz results was called");
	//might have to change this because it's not technically postBody
	var postBody = req.body;
	console.log(req.body);
	var q1=postBody.q1;
	var q2=postBody.q2;
	var q3=postBody.q3;
	var q4=postBody.q4;
	var q5=postBody.q5;
	var q6=postBody.q6;
	var q7=postBody.q7;
	var q8=postBody.q8;
	var q9=postBody.q9;
	var q10=postBody.q10;
	var countryArray=[q1,q2,q3,q4,q5,q6,q7,q8,q9,q10];
	var mCount=0;
	var dCount=0;
	var rCount=0;
	var sCount=0;

	for(var i=0;i<countryArray.length;i++){
		console.log(countryArray[i]);
		if(countryArray[i]==='a'){
			mCount++;
		}else if(countryArray[i]==='b'){
			dCount++;
		}else if(countryArray[i]==='c'){
			rCount++;
		}else if(countryArray[i]==='d'){
			sCount++;
		}
	}
	console.log(mCount+", "+dCount+","+rCount+","+sCount);
	if(mCount > dCount && mCount > rCount && mCount > sCount){
		res.send({city: "madrid",
				country: "spain"});
	}else if(dCount > mCount && dCount > rCount && dCount > sCount){
		res.send({city:"dublin",
				country:"ireland"});
	}else if(rCount> mCount && rCount > dCount && rCount> sCount){
		res.send({city:"rio",
				country:"brazil"});
	}else if(sCount > mCount && sCount > dCount && sCount > rCount){
		res.send({city:"sydney",
				country:"australia"});
	}else{
		res.send({city:"rio",
				country:"brazil"});
	}
});

// start the server on http://localhost:3000/
var server = app.listen(3000, function () {
  var port = server.address().port;
  console.log('Server started at http://localhost:%s/', port);
});
