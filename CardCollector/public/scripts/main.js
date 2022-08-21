/**
/**
 * @fileoverview
 * Provides the JavaScript interactions for all pages.
 *
 * @author 
 * PUT_YOUR_NAME_HERE
 */

/** namespace. */
var rhit = rhit || {};

/** globals */
rhit.FB_COLLECTION_CARDS = "CardCollections";
rhit.FB_KEY_COLLECTION = "Collection";
rhit.FB_KEY_COLLECTIONS = "Collections"
rhit.FB_KEY_SET = "collectionName";
rhit.FB_KEY_LAST_TOUCHED = "lastTouched";
rhit.FB_KEY_COLLECTIONID = "collectionID";
rhit.FB_COLLECTION_USERS = "Users";
rhit.FB_KEY_NAME = "name";
rhit.FB_KEY_PHOTO_URL = "photoUrl";
rhit.FB_KEY_LOCATION = "location";
rhit.FB_KEY_PAYMENT = "payment";
rhit.FB_KEY_BACKOUT = "backout";
rhit.FB_KEY_HOLDUP = "holdup";
rhit.FB_KEY_CARD_NAME = "cardName";
rhit.FB_KEY_CARD_URL = "cardUrl";

rhit.fbCollectionsManager = null; //singleton
rhit.fbSingleCollectionManager = null;
rhit.fbAuthManager = null;
rhit.fbUserManager = null;


//from stackoverflow
function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.SideNavController = class {
	constructor() {

		const wishfab = document.querySelector("#wishlistFab");
		if(wishfab){

			document.querySelector("#wishlistFab").onclick = (event) => {
				html2canvas(document.querySelector("#capture")).then(canvas => {
					var download = function(){
						var link = document.createElement('a');
						link.download = 'filename.png';
						link.href = canvas.toDataURL()
						link.click();
					  }
					download();
				});
			}
		}

		const gotoProfile = document.querySelector("#menuGoToProfilePage");
		if(gotoProfile){
			gotoProfile.onclick = () => {
				window.location.href="/profile.html";
			}
		}
		const profileIcon = document.querySelector("#profileIcon");

		if (profileIcon) {
			if (rhit.fbAuthManager.isSignedIn) {
				profileIcon.href = "/profile.html";
			} else {
				profileIcon.href = "/intro.html";
			}
		}

		const collectionIcon = document.querySelector("#menuCollectionPage");

		if (collectionIcon) {
			if (rhit.fbAuthManager.isSignedIn) {
				collectionIcon.href = "/list.html";
			}
		}
	}

};


rhit.ListPageController = class {
	constructor() {
		document.querySelector("#submitAddCollection").addEventListener("click", (event) => {
			const collection = document.querySelector("#inputCollection").value;
			rhit.fbCollectionsManager.add(collection);
		});

		$('#addCollectionDialog').on('show.bs.modal', (event) => {
			//preanimation
			document.querySelector("#inputCollection").value = "";
			// document.querySelector("#inputSet").value = "";
		})

		$('#addCollectionDialog').on('shown.bs.modal', (event) => {
			//post animation
			document.querySelector("#inputCollection").focus();
		})

		// document.querySelector("#copyLink").onclick = () => {
		// 	navigator.clipboard.writeText(window.location.href);
		// }

		//start listening!
		rhit.fbCollectionsManager.beginListening(this.updateList.bind(this));
		//"this" will refer to the binded object here, which is "this" in this case

	}

	updateList() {
		//make a new collectionListContainer
		const newList = htmlToElement('<div id="collectionListContainer"></div>');
		//Fill the collectionListContainer with collection cards using a loop
		for (let i = 0; i < rhit.fbCollectionsManager.length; i++) {
			const mq = rhit.fbCollectionsManager.getSetCollectionAtIndex(i);
			const newCard = this._createCard(mq);

			newCard.onclick = (event) => {
				window.location.href = `/setcollection.html?id=${mq.id}`;
			};

			// newCard.querySelector("button").onclick = (event) => {
			// 	rhit.fbCollectionsManager.delete(mq.id);
			// 	console.log("attempt to delete");
			// }

			newList.appendChild(newCard);
		}

		//remove the old collectionListContainer
		const oldList = document.querySelector("#collectionListContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		//put in the new collectionListContainer
		oldList.parentElement.appendChild(newList);
	}

	_createCard(collection) {

		let elementstr = `<li class="list-group-item px-3 row">
	<div class="col-5">${collection.collection} </div>
	<div class="col-3">&nbsp;</div>
	<button class=" btn col-1">
	   &nbsp;
	</button>
	<button class=" btn col-1">
		<i class="material-icons">edit</i>
	</button>
</li>`;
		return htmlToElement(elementstr);
	}
}

rhit.SetCollection = class {
	constructor(id, collection) {
		this.id = id;
		this.collection = collection;
	}
}

rhit.FbCollectionsManager = class {
	constructor(uid) {
		this._uid = uid;
		this._documentSnapshots = [];
		// this._set = firebase.firestore().collection(rhit.FB_COLLECTION_CARDS)
		this._ref = firebase.firestore().collection(rhit.FB_KEY_COLLECTIONS);
		this._unsubscribe = null;
	}

	add(collection) {
		// Add a new document with a generated id.
		this._ref.add({
				[rhit.FB_KEY_COLLECTION]: collection,
				[rhit.FB_KEY_COLLECTIONID]: rhit.fbAuthManager.uid,
				[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			})
			.then((docRef) => {
				console.log("Document written with ID: ", docRef.id);
			})
			.catch((error) => {
				console.error("Error adding document: ", error);
			});

	}

	beginListening(changeListener) {
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").limit(50);
		if (this._uid) {
			query = query.where(rhit.FB_KEY_COLLECTIONID, "==", this._uid);
		}

		this._unsubscribe = query
			.onSnapshot((querySnapshot) => {
				console.log("set collection update");
				this._documentSnapshots = querySnapshot.docs;
				// querySnapshot.forEach((doc) => {
				// 	console.log(doc.data());
				// })
				changeListener();
				// if(changeListener){
				// 	changeListener();
				// }
			});
	}


	stopListening() {
		this._unsubscribe();
	}

	update(id, collection, set) {}
	delete(id) {

		firebase.firestore.collection(rhit.FB_KEY_COLLECTIONS).doc(id).delete;
	}

	get length() {
		return this._documentSnapshots.length;
	}

	getSetCollectionAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const mq = new rhit.SetCollection(
			docSnapshot.id,
			docSnapshot.get(rhit.FB_KEY_COLLECTION),
		);

		return mq;
	}
}

rhit.FbSetManager = class {
	constructor(collection) {
		this._collection = collection;
		this._documentSnapshots = [];
		// this._set = firebase.firestore().collection(rhit.FB_COLLECTION_CARDS)
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_CARDS).document(collection).collection(rhit.FB_KEY_SET);
		this._unsubscribe = null;
	}

	add(collection) {
		// Add a new document with a generated id.
		this._ref.add({
				[rhit.FB_KEY_COLLECTION]: collection,
				[rhit.FB_KEY_COLLECTIONID]: rhit.fbAuthManager.uid,
				[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			})
			.then((docRef) => {
				console.log("Document written with ID: ", docRef.id);
			})
			.catch((error) => {
				console.error("Error adding document: ", error);
			});

	}

	beginListening(changeListener) {
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").limit(50);
		if (this._uid) {
			query = query.where(rhit.FB_KEY_COLLECTIONID, "==", this._uid);
		}

		this._unsubscribe = query
			.onSnapshot((querySnapshot) => {
				console.log("set collection update");
				this._documentSnapshots = querySnapshot.docs;
				// querySnapshot.forEach((doc) => {
				// 	console.log(doc.data());
				// })
				changeListener();
				// if(changeListener){
				// 	changeListener();
				// }
			});
	}


	stopListening() {
		this._unsubscribe();
	}

	update(id, collection, set) {}
	delete(id) {}

	get length() {
		return this._documentSnapshots.length;
	}

	getSetAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const mq = new rhit.Set(
			docSnapshot.id,
			docSnapshot.get(rhit.FB_KEY_SET),
		);

		return mq;
	}
}

//Detail page
rhit.DetailPageController = class {
	constructor() {
		document.querySelector("#submitFile").onclick = (event) => {
			document.querySelector("#inputFile").click();
			
		};

		this._file = "";
		
		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			rhit.fbAuthManager.sighOut();
		});

		document.querySelector("#inputFile").addEventListener("change", (event) => {
			this._file = event.target.files[0];
			

			
		});

		$('#addPhotoDialog').on('show.bs.modal', (event) => {
			//preanimation
			document.querySelector("#inputName").value ="";
			// document.querySelector("#inputSet").value = "";
		});



		document.querySelector("#submitAddCollection").onclick = (event) => {
			const set = document.querySelector("#inputName").value;
			rhit.fbSingleCollectionManager.uploadPhotoToStorage(set, this._file);
		}
		// document.querySelector("#submitDeleteCollection").addEventListener("click", (event) => {
		// 	rhit.fbSingleCollectionManager.delete().then(() => {
		// 		console.log("Document successfully deleted!");
		// 		window.location.href = "/list.html";
		// 	}).catch((error) => {
		// 		console.error("Error removing document:", error);
		// 	});
		// });


		rhit.fbSingleCollectionManager.beginListening(this.updateView.bind(this)); //who to call for updates
	}

	updateView() {
		
		if (!rhit.fbUserManager.isListening) {
			rhit.fbUserManager.beginListening(
				rhit.fbSingleCollectionManager.author,
				this.updateAuthorBox.bind(this));
		}
		const newList = htmlToElement('<div id="columns"></div>');

		for(let i = 0; i < rhit.fbSingleCollectionManager.length; i++){
			const card = rhit.fbSingleCollectionManager.getCardAtIndex(i);
			const newCard = this._createCard(card);

			// newCard.onclick = (event) => {
			// 	console.log("clicked photo card");
			// 	window.location.href=`/photoPage.html?id=${photo.id}`;
			// 	// document = window.document by default
			// };
			newList.appendChild(newCard);
		}

		const oldList = document.querySelector("#columns");
		oldList.removeAttribute("id");
		oldList.hidden = true;

		oldList.parentElement.appendChild(newList);
	}

	_createCard(card){
		return htmlToElement(`<div class="pin" id="${card.url}">
        <img
          src="${card.url}"
          alt="${card.name}">
        <p class="caption">${card.name}</p>
      </div>`);



		// document.querySelector("#cardCollection").innerHTML = rhit.fbSingleCollectionManager.collection;
		// document.querySelector("#cardSet").innerHTML = rhit.fbSingleCollectionManager.set;


	}

	updateAuthorBox() {
		
		if (rhit.fbUserManager.name) {
			
			document.querySelector("#authorName").innerHTML = rhit.fbUserManager.name;
		};
		if (rhit.fbUserManager.photoUrl) {
			document.querySelector("#profilePhoto").src = rhit.fbUserManager.photoUrl;
		};
		if (rhit.fbUserManager.location) {
			document.querySelector("#inputLocation").innerHTML = rhit.fbUserManager.location;
		};
		if (rhit.fbUserManager.payment) {
			document.querySelector("#inputPayment").innerHTML =`payment: ${rhit.fbUserManager.payment}` ;
		};
		if (rhit.fbUserManager.backout) {
			document.querySelector("#inputBackout").innerHTML =`Backout: ${rhit.fbUserManager.backout}`  ;
		};
		if (rhit.fbUserManager.holdup) {
			document.querySelector("#inputHoldup").innerHTML = `Hold up: ${rhit.fbUserManager.holdup}`;
		};


		document.querySelector("#authorBox").onclick = (event) => {
				window.location.href = "/profile.html";
		};
	}




	 
}

rhit.FbSingleCollectionManager = class {
	constructor(collectionId) {
		this._documentSnapshot = [];
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_CARDS);
		this._collectionId = collectionId;
		//firebase document reference

	}

	beginListening(changeListener){ 
		console.log(this._ref,"referenceneice");
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").limit(50);
		if(this._collectionId){
			query = query.where(rhit.FB_KEY_COLLECTIONID, "==", this._collectionId);
		}

		this._unsubscribe = query
		.onSnapshot((querySnapshot) => {
			console.log("photo update");
			this._documentSnapshots = querySnapshot.docs;
			changeListener();
		});
	 }

		//firebase - cloud firestore - read data - get data once
		// this._ref.get().then((doc) => {
		// }).catch((error) => {
		// 	console.log(`Error getting document ${error}`);
		// });


	stopListening() {
		this._unsubscribe();
	}

	// update(collection, set) {
	// 	this._ref.update({
	// 			[rhit.FB_KEY_COLLECTION]: collection,
	// 			[rhit.FB_KEY_SET]: set,
	// 			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
	// 		})
	// 		.then(() => {
	// 			console.log("Document successfully updated");
	// 		})
	// 		.catch((error) => {
	// 			console.error("Error updating document: ", error);
	// 		});

	// }

	add(set, fileUrl){
		this._ref.add({
			[rhit.FB_KEY_CARD_NAME]:set,
			[rhit.FB_KEY_CARD_URL]: fileUrl,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			[rhit.FB_KEY_COLLECTIONID]:this._collectionId
		}).then((docRef) => {
			console.log("Document written with ID: ", docRef.id);
		})
		.catch((error) => {
			console.error("Error adding document: ", error);
		});
	}

	uploadPhotoToStorage(set, file) {
		const metadata = {
		  "content-type": file.type
		};
		//TODO: error firebase.storage() is not a function
		console.log(file);
		//    const storageRef = firebase.storage().ref().child(rhit.FB_COLLECTION_USERS).child(rhit.fbAuthManager.uid);
		firebase.firestore().collection(this._collectionId).add({})
		  .then((docRef) => {
			console.log('file :>> ', file);
			console.log('set :>> ', set);
			console.log("Blank document written with ID: ", docRef.id);
			const nextAvailableKey = docRef.id;
			const storageRef = firebase.storage().ref().child(this._collectionId).child(nextAvailableKey);
			// const storageRef = firebase.storage().ref().child(rhit.FB_COLLECTION_CARDS).child(nextAvailableKey);
			console.log("Ready to upload the file to: ", storageRef);
			storageRef.put(file, metadata).then((uploadSnapshot) => {
			  console.log("Upload is complete!", uploadSnapshot);
			  storageRef.getDownloadURL().then((downloadURL) => {
				console.log("File available at", downloadURL);
				// TODO: Update a Firestore object with this download URL.
				rhit.fbSingleCollectionManager.add(set, downloadURL);
			  });
			});
			console.log("Uploading", file.name);


		  });
	  }

	delete() {
		return this._ref.delete();
	}

	//get space syntax, pretend its a property
	get collection() {
		return this._documentSnapshot.get(rhit.FB_KEY_COLLECTION);
	}

	get set() {
		return this._documentSnapshot.get(rhit.FB_KEY_SET);
	}

	get author() {
		return rhit.fbAuthManager.uid;
	}

	getCardAtIndex(index){ 
		const docSnapshot = this._documentSnapshots[index];
		const card = new rhit.Card(
			docSnapshot.id,
			docSnapshot.get(rhit.FB_KEY_CARD_URL),
			docSnapshot.get(rhit.FB_KEY_CARD_NAME)
		);
		
		return card;
	 }
	 get length(){
		return this._documentSnapshots.length;
	  }

}

rhit.Card = class{
	constructor(id, url, name){
		this.id = id;
		this.url = url;
		this.name = name;
	}
}


rhit.LoginPageController = class {
	constructor() {
		document.querySelector("#rosefireButton").onclick = (event) => {
			rhit.fbAuthManager.signIn();
		};
		rhit.fbAuthManager.startFirebaseUI();
	}
}

rhit.FbAuthManager = class {
	constructor() {
		this._user = null;
		this._name = "";
		this._photoUrl = "";
	}
	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {
			this._user = user;
			changeListener();
		});

	}
	signIn() {
		// Please note this needs to be the result of a user interaction
		// (like a button click) otherwise it will get blocked as a popup
		Rosefire.signIn("41ef7116-6dd9-4ed7-8431-e1f822dff74d", (err, rfUser) => {
			if (err) {
				console.log("Rosefire error!", err);
				return;
			}
			console.log("Rosefire success!", rfUser);
			this._name = rfUser.name;
			firebase.auth().signInWithCustomToken(rfUser.token).catch((error) => {
				const errorCode = error.code;
				const errorMessage = error.message;
				if (errorCode === 'auth/invalid-custom-token') {
					alert('The token you provided is not valid.');
				} else {
					console.error("Custom auth error".errorCode, errorMessage);
					//stucky authentication with firebase
				}
			});

		});

	}

	sighOut() {
		firebase.auth().signOut().catch((error) => {
			console.log("sign out error");
		});
	}
	startFirebaseUI = function () {
		// FirebaseUI config.
		var uiConfig = {
			signInSuccessUrl: '/',
			signInOptions: [
				// Leave the lines as is for the providers you want to offer your users.
				firebase.auth.GoogleAuthProvider.PROVIDER_ID,
				firebase.auth.EmailAuthProvider.PROVIDER_ID,
				firebase.auth.PhoneAuthProvider.PROVIDER_ID,
				firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
			],
			// tosUrl and privacyPolicyUrl accept either url string or a callback
			// function.
			// Terms of service url/callback.
			tosUrl: '<your-tos-url>',
			// Privacy policy url/callback.
			privacyPolicyUrl: function () {
				window.location.assign('<your-privacy-policy-url>');
			}
		};

		// Initialize the FirebaseUI Widget using Firebase.
		const ui = new firebaseui.auth.AuthUI(firebase.auth());
		// The start method will wait until the DOM is loaded.
		ui.start('#firebaseui-auth-container', uiConfig);
	}

	get isSignedIn() {
		return !!this._user;
	}

	get uid() {
		return this._user.uid;
	}

	get name() {
		return this._name || this._user.displayName;
	}

	get photoUrl() {
		return this._photoUrl || this._user.photoURL;
	}
}

rhit.ProfilePageController = class {
	constructor() {
		//handle two buttons
		document.querySelector("#submitPhoto").onclick = (event) => {
			document.querySelector("#inputFile").click();
		};
		document.querySelector("#inputFile").addEventListener("change", (event) => {
			const file = event.target.files[0];
			console.log(`received file name ${file.name}`);
			const storageRef = firebase.storage().ref().child(rhit.fbAuthManager.uid);
			storageRef.put(file).then((uploadSnapshot) => {
				console.log("Upload is complete!", uploadSnapshot);
				return storageRef.getDownloadURL();
			}).then((downloadURL) => {
				console.log("File available at", downloadURL);
				rhit.fbUserManager.updatePhotoUrl(downloadURL);
			});
		});

		document.querySelector("#submitName").onclick = (event) => {
			rhit.fbUserManager.updateUser().then(() => {
				window.location.href = "/list.html";
			});
		};
		//start listening for users
		rhit.fbUserManager.beginListening(rhit.fbAuthManager.uid, this.updateView.bind(this));
	}

	updateView() {
		if (rhit.fbUserManager.name) {
			document.querySelector("#inputName").value = rhit.fbUserManager.name;
		}
		if (rhit.fbUserManager.photoUrl) {
			document.querySelector("#profilePhoto").src = rhit.fbUserManager.photoUrl;
		}

		if (rhit.fbUserManager.location) {
			document.querySelector("#inputLocation").value = rhit.fbUserManager.location;
		}
		if (rhit.fbUserManager.payment) {
			document.querySelector("#inputPayment").value = rhit.fbUserManager.payment;
		}
		if (rhit.fbUserManager.backout) {
			document.querySelector("#inputBackout").value = rhit.fbUserManager.backout;
		}
		if (rhit.fbUserManager.holdup) {
			document.querySelector("#inputHoldup").value = rhit.fbUserManager.holdup;
		}
		
	}
}

rhit.FbUserManager = class {
	constructor() {
		this._collectionRef = firebase.firestore().collection(rhit.FB_COLLECTION_USERS);
		this._document = null;
		this._unsubscribe = null;
	}

	addNewUserMaybe(uid, name, photoUrl) {
		//check if the user is in firebase already
		const userRef = this._collectionRef.doc(uid);

		return userRef.get().then((doc) => {
			if (doc.exists) {
				//Do nothing, already a user
				// console.log("Document data:", doc.data());
				return false;
			} else {
				//No user, create
				// console.log("no user, create one");\
				return userRef.set({
					[rhit.FB_KEY_NAME]: name,
					[rhit.FB_KEY_PHOTO_URL]: photoUrl
				}).then(() => {
					return true;
				});
				// .then().catch((error) => {
				// })
			}
		}).catch((error) => {
			console.log("error in add new ");
		});
	}

	beginListening(uid, changeListener) {
		const userRef = this._collectionRef.doc(uid);
		//firebase - cloud firestore - read data- listen for realtime updates 
		this._unsubscribe = userRef.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Documentdata:", doc.data());
				this._document = doc;
				changeListener();
			} else {
				console.log("no user!");
			}
		});
	}

	stopListening() {
		this._unsubscribe();
	}

	updatePhotoUrl(photoUrl) {
		const userRef = this._collectionRef.doc(rhit.fbAuthManager.uid);
		userRef.update({
			[rhit.FB_KEY_PHOTO_URL]: photoUrl

		}).then(() => {
			console.log("update photo url success");
		});
	}

	updateUser() {
		const userRef = this._collectionRef.doc(rhit.fbAuthManager.uid);
		return userRef.update({
			[rhit.FB_KEY_NAME]: document.querySelector("#inputName").value,
			[rhit.FB_KEY_LOCATION]: document.querySelector("#inputLocation").value,
			[rhit.FB_KEY_PAYMENT]: document.querySelector("#inputPayment").value,
			[rhit.FB_KEY_BACKOUT]: document.querySelector("#inputBackout").value,
			[rhit.FB_KEY_HOLDUP]: document.querySelector("#inputHoldup").value,

		}).then(() => {
			console.log("update name success");
		});
	}

	get name() {
		return this._document.get(rhit.FB_KEY_NAME);
	}
	get photoUrl() {
		return this._document.get(rhit.FB_KEY_PHOTO_URL);
	}
	get location(){
		return this._document.get(rhit.FB_KEY_LOCATION);
	}
	get payment(){
		return this._document.get(rhit.FB_KEY_PAYMENT);
	}
	get backout(){
		return this._document.get(rhit.FB_KEY_BACKOUT);
	}
	get holdup(){
		return this._document.get(rhit.FB_KEY_HOLDUP);
	}
	get isListening() {
		return !!this._unsubscribe;
	}
}


rhit.checkForRedirects = function () {
	if (document.querySelector("#loginPage") && rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/list.html";
	}

	if (!document.querySelector("#loginPage") && !rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/";
	}

};

rhit.initializePage = function () {

	const urlParams = new URLSearchParams(window.location.search);
	new rhit.SideNavController();

	if (document.querySelector("#listPage")) {
		console.log("you are on the list page.");
		const uid = urlParams.get("uid");

		rhit.fbCollectionsManager = new rhit.FbCollectionsManager(uid);
		new rhit.ListPageController();
	}

	if (document.querySelector("#setPage")) {
		console.log("you are on the detail page");

		const setCollectionId = urlParams.get("id");


		if (!setCollectionId) {
			window.location.href = "/";
		}

		rhit.fbSingleCollectionManager = new rhit.FbSingleCollectionManager(setCollectionId);
		new rhit.DetailPageController();
	}

	if (document.querySelector("#loginPage")) {
		console.log("you are on the login page");
		new rhit.LoginPageController();
	}

	if (document.querySelector("#profilePage")) {
		console.log("you are on the login page");
		new rhit.ProfilePageController();
	}

};

rhit.createUserObjectIfNeeded = function () {
	return new Promise((resolve, reject) => {
		//resolve();

		//Check if a User might be new
		if (!rhit.fbAuthManager.isSignedIn) {
			resolve(false);
			return;
		}
		if (!document.querySelector("#loginPage")) {
			resolve(false);
			return;
		}
		//call addNewUserMaybe
		rhit.fbUserManager.addNewUserMaybe(
			rhit.fbAuthManager.uid,
			rhit.fbAuthManager.name,
			rhit.fbAuthManager.photoUrl
		).then((isUserNew) => {
			resolve(isUserNew);
		})
	});
};

/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");
	rhit.fbAuthManager = new rhit.FbAuthManager(); //auth is global status
	rhit.fbUserManager = new rhit.FbUserManager();
	rhit.fbAuthManager.beginListening(() => {
		console.log("is signed in = ", rhit.fbAuthManager.isSignedIn);

		rhit.createUserObjectIfNeeded().then((isUserNew) => {
			if (isUserNew) {
				window.location.href = "/profile.html";
				return;
			}

			rhit.checkForRedirects();
			rhit.initializePage();
		})

	});




	//temp code for Read and Add
	//getting from the cloud
	// const ref = firebase.firestore().collection("SetCollections");
	// //copied from firebase: Listen for realtime updates
	// ref.onSnapshot((querySnapshot) => {
	// 	querySnapshot.forEach((doc) => {//doc stands for document snapshot
	// 		console.log(doc.data()); 
	// 	});
	// });

	// //send to the cloud
	// ref.add({
	// 	collection: "My first test",
	// 	set: "My first set",
	// 	lastTouched: firebase.firestore.Timestamp.now(),
	// });


};

rhit.main();
