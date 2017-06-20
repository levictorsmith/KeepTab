//Add some data
store.put({id: 12345, name: {first: "John", last: "Doe"}, age: 42});
store.put({id: 67890, name: {first: "Bob", last: "Smith"}, age: 35});

//Query the data
var getJohn = store.get(12345);
var getBob = index.get(["Smith", "Bob"]);

getJohn.onsuccess = function () {
	console.log(getJohn.result.name.first);
};

getBob.onsuccess = function () {
	console.log(getBob.result.name.first);
};