MavBox
===========

Provides MavBox and MavBox.Media for the displaying of Dialog styled windows for text, media, and webpages.

![MavBox](https://github.com/dcdustin/MavBox/blob/master/MavBox.png)

How to use
----------

*CSS*
	#CSS
/* CONTAINER ELEMENT */
.mavbox { position: absolute; display: none; z-index: 1000; }

/* USED IF NO TITLEBAR IS SET */
.mavbox .mavbox-notitle { }

/* USED IF NO BUTTONS ARE SET */
.mavbox .mavbox-nobuttons {  }

/* TITLEBAR ELEMENT */
.mavbox > div.mavbox-titlebar { }
	.mavbox > div.mavbox-movable { cursor: move !important; }
	.mavbox > div.mavbox-titlebar > .mavbox-titletext {  }
	.mavbox > div.mavbox-titlebar > div.mavbox-button { }
		.mavbox > div.mavbox-titlebar > div.mavbox-button:hover { }
	.mavbox div.mavbox-titleclose { }
	.mavbox div.mavbox-titlemin { }
	.mavbox div.mavbox-titlemin-restore { }
	.mavbox div.mavbox-titlemax { }
	.mavbox div.mavbox-titlemax-restore { }

/* BOX'S MESSAGE AREA */
.mavbox > div.mavbox-message { overflow: auto; }

/* BUTTON AREA */
.mavbox > div.mavbox-buttonarea { }
.close-button { }

/* BOX'S BUTTONS */
.mavbox > div.mavbox-buttonarea > .mavbox-button { }


*JS*
	#JS
	mavbox = new MavBox({
		'id': 'myMavBox',
		'width': 450,
		'maxHeight': '300px',
		'modal': true, 
		'draggable': true,
		'blurHides': false,
		'keyboardAccess': true,
		'persistent': true,
		'message': "This is a very nice box you've placed me in, thank you.",
		'title': 'A Nice little MavBox',
		'titleButtons': {'close':true,'max':true,'min':true},
		'buttons': [{
			'text': 'close',
			'id': 'myButtonID',
			'class': 'no-class-thanks'
		}]
	});	
