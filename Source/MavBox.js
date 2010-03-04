/*
---

script: MavBox
description: My implementation of an accessible dialog window built on mootools.
license: MIT-style license.
authors: Dustin Hansen
docs: http://maveno.us
requires:
- core/1.2.4
- more/1.2.4.2: [Class.Occludes]

provides: [MavBox, MavBox.Request, MavBox.Request.HTML, MavBox.Media]

---
*/

var MavBox = new Class({
	Implements: [Options, Events],

	Binds: ['show', 'hide', 'blurHide', 'maximize', 'minimize', 'positionBox', 'keyboardResponse'],

	options: {
		'buttons': null, // [{'text': '', 'id': '', 'class': '', 'click': function(){}, 'autoClose': true}]		
		'autoRender': true,
		'autoShow': true,
		'blurHides': false,
		'bounds': null,
		'boxClass': 'mavbox',
		'draggable': true,
		'fixed': false,
		'height': 'auto',
		'hideDestroys': false,
		'id': null,
		'keyboardAccess': true, // partial
		'maxHeight': false,
		'maxWidth': false,
		'message': null,
		'minHeight': false,
		'minWidth': false,
		'modal': false,
		'persistent': false, // if true, window remembers position when closed
		'position': 'center center',
		'resizable': false, // not yet implemented
		'spinner': '/library/media/images/spinner_fb.gif',
		'spinnerSize': {'x':26,'y':21},
		'taskElement': null, // not yet used
		'title': false,
		'titleButtons': {'close':true,'min':false,'max':false},
		'useCache': true,
		'useFx': true,
		'fxOptions': {'duration': 500, 'link': 'chain'},
		'useShim': true,
		'watchResize': true,
		'width': 400,
		'zIndex': 1000
/*
	x onRender, onOpen, onBeforeClose, onClose, onBeforeDestroy,
	x onDrag, onDragStart, onDragStop, 
	onResizeStart, onResize, onResizeStop
	onFocus, onBlur
 */
	},

	restore: {'max':null,'min':null,'resize':null},
	showing: false,
	shown: null,
	urlResponse: null,

	initialize: function(_options) {
		this.setOptions(_options);

		this.id = this.options.id || 'mavBox_' + this.options.zIndex;

		this.bounds = this.options.bounds || document.body;

		// used for global stack order
		var mbzIndex;
		if ((mbzIndex = document.id(document.body).retrieve('mbzIndex'))) {
			this.options.zIndex = mbzIndex++;
		}

		document.body.store('mbzIndex', this.options.zIndex);

		// render the box element
		if (this.options.autoRender) { this.render(); }

		if (this.options.watchResize) {
			window.addEvent('resize', this.positionBox.bind(this));
		}
	},
	destroy: function() {
		this.fire('beforeDestroy');

		this.elem.dispose();

		if (this.shadeElem) { this.shadeElem.dispose(); }

		if ($type(this.media) == 'array' && this.media.length > 0) { delete this.media; }

		delete this;
	},

	render: function() {
		var title = null, self = this;

		// create the containing element
		this.elem = new Element('div', {
			'id': this.id,
			'class': this.options.boxClass,
			'role': 'dialog',
			'tabindex': '-1',
			'styles': {
				'outline': '0',
				'width': (this.options.maxWidth || this.options.width),
				'height': this.options.height, 
				'zIndex': this.options.zIndex,
				'position': (this.options.fixed ? 'fixed' : 'absolute')
			}
		}).inject(this.bounds);

		// create the titlebar
		if (this.options.title !== false) {
			title = (!$chk(this.options.title) && this.options.title !== false && document.id(this.options.message) ? 
					 document.id(this.options.message).get('title') : this.options.title);

			this.titleBar = new Element('div', {
				'class': 'mavbox-titlebar',
				'html': '<span class="mavbox-titletext">' + title + '</span>'
			}).addEvent('mousedown', function() {
				var mbzIndex = (parseInt(document.id(document.body).retrieve('mbzIndex')));

				self.options.zIndex = ++mbzIndex;

				document.body.store('mbzIndex', mbzIndex);

				self.elem.setStyle('zIndex', mbzIndex);
			}).inject(this.elem);

			this.setTitlebar();
		}

		// create the message area
		this.messageArea = new Element('div', {
			'id': this.id + '_messagearea',
			'class': 'mavbox-message' + (title == null ? ' mavbox-notitle' : '')
		}).inject(this.elem);

		if (!this.titleBar) {
			this.elem.addEvent('mousedown', function() {
				var mbzIndex = (parseInt(document.id(document.body).retrieve('mbzIndex')));

				self.options.zIndex = ++mbzIndex;

				document.body.store('mbzIndex', mbzIndex);

				self.elem.setStyle('zIndex', mbzIndex);
			});
		}

		// determine the message content
		this.setMessage();

		// TODO: make draggable if this.options.draggable
		if (this.options.draggable) {
			// onDrag, onDragStart, onDragStop
			this.draggable = new Drag.Move(this.elem, {
				'container': (Browser.Engine.trident ? null : this.bounds),
				'stopPropagation': true,
				'handle': (this.titleBar || this.elem),
				'onStart': function(_el) { self.fireEvent('dragStart', _el); },
				'onDrag': function(_el, _e) { self.fireEvent('drag', [_el, _e]); },
				'onComplete': function(_el, _e) { self.fireEvent('dragStop', [_el, _e]); }
			});

			if (this.titleBar) { this.titleBar.addClass('mavbox-movable'); }
		}

		// TODO: make resizable if this.options.resizable

		// create the footer area
		if ($chk(this.options.buttons)) {
			this.buttonArea = new Element('div', {
				'class': 'mavbox-buttonarea'
			}).inject(this.elem);

			this.setButtons(this.options.buttons);
		} else {
			this.messageArea.addClass('mavbox-nobuttons');
		}
		
		this.fireEvent('render');

		// show box if autoshow
		if (this.options.autoShow) { this.show(); }
	},

	setMessage: function(_msg, _type) {
		var msgElem, msg = (_msg || this.options.message);
		
		if (($type(this.options.message) == 'string' && this.options.message == '')) {
			this.messageArea.empty();
		}
		else if ((msgElem = document.id(msg))) {
			msgElem.set('title', '');

			this.messageParent = msgElem.getParent();

			this.messageArea.adopt(msgElem);

			msgElem.setStyle('display', 'block').removeClass('none');
		} else 
			this.messageArea.set('html', msg);
	},

	setTitlebar: function() {
		if ($chk(this.options.titleButtons)) {
			var buttons = [];

			if (this.options.titleButtons.close) {
				buttons.push({'id':this.id + '_titleclose', 'text':'close','class':'mavbox-titleclose'});
			}

			if (this.options.titleButtons.max) {
				buttons.push({'id':this.id + '_titlemax', 'text':'maximize','class':'mavbox-titlemax','autoClose':false,'click':this.maximize});
			}

			// is this really even needed?
			if (this.options.titleButtons.min) {
				buttons.push({'id':this.id + '_titlemin', 'text':'minimize','class':'mavbox-titlemin','autoClose':false,'click':this.minimize});
			}

			this.setButtons(buttons, this.titleBar);
		}
	},

	setButtons: function(_buttons, _parent) {
		var parent = _parent || this.buttonArea;

		var argType = $type(_buttons);

		if (argType == 'array' || argType == 'object') {
			var self = this;

			_buttons.each(function(_val, _idx) {
				new Element('div', {
					'id': (_val['id'] || this.id + (_val.text).replace(/\W+/g, '')),
					'class': 'mavbox-button' + ($chk(_val['class']) ? ' ' + _val['class'] : ''),
					'html': _val.text
				}).addEvent('click', function(e) {
					e.stop();

					if ($type(_val['click']) == 'function') { _val.click.bind(self)(); }

					if (_val['autoClose'] !== false && !['hide','blurHide'].contains(_val['click'])) { self.hide(); }
				}).inject(parent);
			}, this);
		}
	},

	setBoxOnTop: function() {},
	
	show: function() {
		if (this.showing === true) { return; }

		if (!this.shown || !this.options.persistent) { this.positionBox(this.options.position); }

		if (this.options.modal) { this.toggleShade(true); }

		if (this.options.blurHides === true) {
			document.id((!this.options.modal ? window : this.shadeElem)).addEvent('mousedown', this.blurHide);
		}

		if (this.options.keyboardAccess) { window.addEvent('keyup', this.keyboardResponse); }

		if (this.options.useFx) {
			this.elem.set('opacity', 0).setStyle('display','block');

			this.fx = new Fx.Morph(this.elem, this.options.fxOptions).start({'opacity':1});
		} else
			this.elem.setStyle('display', 'block');

		this.showing = this.shown = true;

		this.fireEvent('open');
	},

	hide: function() {
		if (this.showing === false) { return; }

		this.fireEvent('beforeClose');

		if (this.options.hideDestroys) this.destroy();
		else {
			document.id((!this.options.modal ? window : this.shadeElem)).removeEvent('mousedown', this.hide);

			window.removeEvent('keyup', this.keyboardResponse);

			if (this.options.useFx) {
				var self = this;

				this.fx.start({'opacity':0}).chain(function() { 
					self.elem.setStyle('display', 'none');

					self.toggleShade(false);
				});
			} else {
				this.elem.setStyle('display', 'none');
			}
		}

		this.showing = false;

		this.fireEvent('close');
	},

	blurHide: function(_e) {
		if (_e.target != this.elem && !_e.target.getParent('div.' + this.options.boxClass)) { this.hide(); }
	},

	minimize: function() {
		var elemSize;
		if (this.restore.min == null) {
			$$('.mavbox div.mavbox-titlemin')[0].removeClass('mavbox-titlemin').addClass('mavbox-titlemin-restore');

			this.restore.min = this.elem.getStyle('height');

			this.messageArea.setStyle('display','none');

			if (this.buttonArea) { this.buttonArea.setStyle('display', 'none'); }

			elemSize = this.titleBar.getSize.y;
		} else {
			$$('.mavbox div.mavbox-titlemin-restore')[0].addClass('mavbox-titlemin').removeClass('mavbox-titlemin-restore');

			this.messageArea.setStyle('display','block');

			if (this.buttonArea) { this.buttonArea.setStyle('display', 'block'); }

			elemSize = this.restore.min;

			this.restore.min = null;
		}

		this.elem.setStyles({'height': elemSize});
	},
	
	maximize: function() {
		var elemSize;
		if (this.restore.max == null) {
			$$('.mavbox div.mavbox-titlemax')[0].removeClass('mavbox-titlemax').addClass('mavbox-titlemax-restore');

			this.restore.max = this.elem.getCoordinates();

			elemSize = {'left': 0,'top': 0,'width':this.docSize.x + 'px','height':this.docSize.y + 'px'};
		} else {
			$$('.mavbox div.mavbox-titlemax-restore')[0].addClass('mavbox-titlemax').removeClass('mavbox-titlemax-restore');

			elemSize = this.restore.max;

			this.restore.max = null;
		}
			
		this.elem.setStyles(elemSize);
	},

	keyboardResponse: function(_e) {
		// other options to follow
		switch(_e.key) {
			case 'esc': this.hide(); break;
		}
	},

	// TODO: if the message is an image, need to preload it so the positioning is correct
	positionBox: function(_xy, _force) {
		// IE bug fix. this.bounds should already be document.body, or specified parent... grrr.
		this.docSize = document.id((this.bounds || document.body)).getSize();
		
		if (this.shown && this.options.persistent && !_force) { return; }

		var wasHidden = false, coords, bX, bY, _xy = (_xy || this.options.position);

		// move off screen so we can get the size without it flickering
		if (this.elem.getStyle('display') == 'none') {
			wasHidden = true;

			this.elem.setStyles({ 'left':'-10000px', 'top': 0, 'display': 'block' });
		}

		this.minMax = {
			'minWidth': this.options.minWidth || 'inherit',
			'minHeight': this.options.minHeight || 'inherit',
			'maxWidth': this.options.maxWidth || 'inherit',
			'maxHeight': this.options.maxHeight || 'inherit'
		};
		this.messageArea.setStyles(this.minMax);

		if ($type(this.options.position) == 'array') {
			coords = this.options.position;
		} else {
			coords = this.options.position.split(" ");

			if (coords.length < 2) { coords[1] = 'center'; }
		}

		this.size = this.elem.getSize();

		bX = ($type(coords[0]) == 'string' ? this.translatePos(coords[0], 'x') : coords[0]);
		bY = ($type(coords[1]) == 'string' ? this.translatePos(coords[1], 'y') : coords[1]);

		this.elem.setStyle('display', (wasHidden ? 'none' : 'block')).setStyles({'left': bX, 'top': bY});

		if (this.options.useShim && (Browser.Engine.trident4 || Browser.Engine.presto)) {
			this.shim = new IFrameShim(this.elem, {'margin':2, 'className':'mavbox-iframeshim'});
		}
	},
	
	translatePos: function(_str, _xy) {
		var docScroll = document.id((this.bounds || document.body)).getScroll();

		switch(_str) {
			case 'left': case 'top': 
				_str = 0 + docScroll[_xy]; break;

			case 'right': case 'bottom':
				_str = ((this.docSize[_xy] - this.size[_xy]) + docScroll[_xy]) + 'px'; break;

			case 'center': case 'middle': default:
				_str = (((this.docSize[_xy] - this.size[_xy])/2) + docScroll[_xy]) + 'px';
		}
		
		if (_str.toInt() < 0) { _str = 0; }

		return _str;
	},

	toggleShade: function(_show) {
		if (!this.shadeElem) {
			this.shadeElem = new Element('div', {'class': 'mavbox-shade'}).inject(this.bounds);
		}

		this.shadeElem.setStyle('display', ((_show !== false && (_show || this.shadeElem.getStyle('display') != 'block')) ? 'block' : 'none'));
	}
});


MavBox.Request = new Class({
	Extends: MavBox,

	Binds: ['processURL', 'messageError'],

	initialize: function(_options) {
		this.parent(_options);
	},

	initXHR: function(_options) {
		if (this.xhr) { delete this.xhr; }

		this.reqOpts = $merge({
			'link': 'chain',
			'url': null, 
			'method': 'get', 
			'noCache': (_options.useCache || false),
			'onSuccess': this.processURL, 
			'onFailure': this.messageError 
		}, (_options || {}));
	},

	setMessage: function(_msg, _type) {
		var msg = (_msg || this.options.message), url = (_type == 'url' ? _msg : this.options.url);

		if ((!$chk(msg) || _type == 'url') && $chk(this.xhr)) {
			if ($chk(_msg) && _type == 'url') {
				this.xhr.options.url = _msg;
				this.messageArea.empty();
			}

			msg = new Element('div', {
				'styles': {
					'height': this.options.spinnerSize.y, 
					'background': 'url(' + this.options.spinner + ') no-repeat center center'
				}
			}).inject(this.bounds);

			var self = this;
			(function(){ self.xhr.send(); }).delay(500);
		}

		msg.inject(this.messageArea);
	},

	processURL: function(_data, _format) {
		this.messageArea.empty();

		this.options.message = new Element('div').inject(this.bounds);

		if ($type(_data) == 'collection' && $type(_data[0]) == 'element') {
			this.options.message.adopt(_data);
		} else {
			this.options.message.set('html', this.options.message);
		}

		this.setMessage();

		this.positionBox(this.options.position, true);
	},

	messageError: function() {
		this.options.message = 'Unable to retrieve URL. Please try again.';

		this.setMessage();
	}
});

MavBox.Request.HTML = new Class({
	Extends: MavBox.Request,
	addOptions: {
		
	},
	initialize: function(_options) {
		this.initXHR(_options);

		this.xhr = new Request.HTML(this.reqOpts);

		this.parent(_options);
	}
});

/*
// would this be useful?!?
MavBox.Request.JSON = new Class({
	Extends: MavBox.Request,
	addOptions: {
	
	},
	initialize: function(_options) {
		this.initXHR(_options);
		
		this.xhr = new Request.HTML(this.reqOpts);

		this.parent(_options);
	}
});
*/

/*
// just because i can, should i? *shrug*
MavBox.Alert = new Class({
	Extends: MavBox,
	addOptions: {},
	initialize: function(_options) {
		var options = $merge(this.addOptions, _options);
		this.parent(options);
	}
});


MavBox.Confirm = new Class({
	Extends: MavBox,
	addOptions: {},
	initialize: function(_options) {
		var options = $merge(this.addOptions, _options);
		this.parent(options);
	}
});


MavBox.Prompt = new Class({
	Extends: MavBox,
	addOptions: {},
	initialize: function(_options) {
		var options = $merge(this.addOptions, _options);
		this.parent(options);
	}
});
*/

MavBox.Media = new Class({
	Extends: MavBox,
	addOptions: {
		'width': 200,
		'height': 200,
		'autoRender': false,
		'autoShow': false,
		'buttons': [{'id':'mav_media_title','text': '','class':'mavbox-media-title','autoClose':false}, {'text': 'close','class':'close-button'}],
		'media': null,
		'message': '',
		'modal': true,
		'preload': false,
		'useCount': true,
		'useTitle': true,
		'watchResize': false,
		'onRender': function() {
			this.postRender();
		}
	},
	offset: 0,
	media: [],

	initialize: function(_options) {
		var options = $merge(this.addOptions, _options);
		this.parent(options);

		if ($type(this.options.media) == 'string') {
			if (!$chk((this.options.media = $$(this.options.media)))) {
				this.options.media = null;
			}
		}

		if ($type(this.options.media) == 'array') {
			var useTitle = this.options.useTitle;
			this.options.media.each(function(_el, _idx) {
				if ($type(_el) == 'element') {
					this.media.push({
						'src': (_el.get('tag') == 'a' ? _el.get('href') : _el.get('src')),
						'title': (useTitle ? (_el.get('title') || _el.getChildren('img')[0].get('title')) : '')
					});
				} else if ($type(_el) == 'string') {
					this.media.push({'src':_el, 'title':null});
				} else {
					this.media.push(_el);
				}
			}, this);

			this.render();

			this.elem.addClass('spinner');

			var self = this;
			window.addEvent('resize', this.positionBox);
		}
	},

	postRender: function() {
		new Element('div', {
			'class': this.options.boxClass + '-goleft',
			'events': {
				'click': this.moveOffset.bind(this, false)
			}
		}).inject(this.messageArea);
		
		new Element('div', {
			'class':this.options.boxClass + '-goright',
			'events': {
				'click': this.moveOffset.bind(this, true)
			}
		}).inject(this.messageArea);
	},

	moveOffset: function(_next) {
		var offset = this.offset + (_next ? 1 : -1);
		if (offset >= 0 && offset < this.media.length) {
			this.show(offset);
		}
	},

	getOffset: function(_href) {
		var found = null;
		this.media.each(function(_el, _idx) {
			if (found != null) { return; }

			if (_el.src == _href) { found = _idx; }
		}, this);

		return found;
	},

	keyboardResponse: function(_e) {
		// other options to follow
		switch(_e.key) {
			case 'esc': this.hide(); break;

			case 'p': if (!_e.alt) { break; }
			case 'left': if (this.showing) { this.moveOffset(false); } break;

			case 'n': if (!_e.alt) { break; }
			case 'right': if (this.showing) { this.moveOffset(true); } break;
			
			case 'c': case 'x':
				if (this.showing && _e.alt) { this.hide(); } break;
		}
	},

	show: function(_href) {
		document.id(this.id + '_messagearea').getChildren('div').removeClass('mavbox-nav-disable');
		this.messageArea.setStyle('background-image','none');

		document.id('mav_media_title').empty();

		this.positionBox(this.options.position);

		if (this.options.modal) { this.toggleShade(true); }

		if (this.options.blurHides === true) {
			document.id((!this.options.modal ? window : this.shadeElem)).addEvent('mousedown', this.blurHide);
		}

		if (this.options.keyboardAccess) { window.addEvent('keyup', this.keyboardResponse); }

		if (this.showing === true) {
			this.setMedia(_href);
			return;
		}

		if (this.options.useFx) {
			this.elem.set('opacity', 0).setStyle('display','block');

			this.fx = new Fx.Morph(this.elem, this.options.fxOptions).start({'opacity':1}).chain(this.setMedia.bind(this, _href));
		} else {
			this.elem.setStyle('display', 'block');

			this.setMedia(_href);
		}

		this.showing = this.shown = true;

		this.fireEvent('open');
	},

	setMedia: function(_href) {
		var self = this;

		this.offset = ($type(_href) == 'number' ? _href : this.getOffset(_href)) || 0;
		if (this.offset == 0) {
			this.messageArea.firstChild.addClass('mavbox-nav-disable');
		}
		else if (this.offset == (this.media.length-1)) {
			this.messageArea.lastChild.addClass('mavbox-nav-disable');
		}

		this.messageArea.setStyle('bottom', this.buttonArea.getSize().y);
		
		if (!$chk(this.media[this.offset]['image'])) {
			this.media[this.offset]['image'] = new Element('img', {
				'src': this.media[this.offset]['src'],
				'styles': {'position':'absolute', 'left': '-10000em', 'top': 0},
				'events': {
					'load': function() {
						self.media[self.offset]['size'] = document.id(this).getSize();
						self.mediaLoaded();
					}
				}
			}).inject((this.bounds || document.body));
		} else {
			this.mediaLoaded();
		}
	},

	mediaLoaded: function() {
		var self = this, size = (this.media[this.offset]['size'] || null);
		if (this.offset != null && $chk(size)) {
			var pos = this.positionMediaBox(size.x, size.y, true);

			var fxTrans = new Fx.Transition(Fx.Transitions.Expo);

			new Fx.Morph(this.elem, {'duration':300,'link':'chain','transition': fxTrans.easeOut})
			.start(pos[0])
			.start(pos[1])
			.chain(function() {
				self.messageArea.setStyles({'opacity':0,'background-image':'url(' + self.media[self.offset].image.src + ')'});

				document.id('mav_media_title').set('html', (self.media[self.offset].title || '') + '<br>' + 'Image ' + (self.offset+1) + ' of ' + self.media.length);

				self.messageArea.tween('opacity', 1);
			});
		}
	},

	positionMediaBox: function(_x, _y, _split) {
		//var ds = this.docSize;
		var pos, par = (this.bounds || document.body), elSize = document.id(par).getSize(), elScroll = document.id(par).getScroll();

		elSize.left = ((elSize.x - _x) / 2) + elScroll.x;
		elSize.top = ((elSize.y - _y) / 2) + elScroll.y;
		
		pos = (_split ? [{'left': elSize.left, 'width': _x},{'top': elSize.top, 'height': _y}] : {
			'left': elSize.left,
			'top': elSize.top,
			'width': _x,
			'height': _y
		});

		return pos;
	}
});

/*
// work in progress...
MavBox.Media.Gallery = new Class({
	Extends: MavBox.Media,
	addOptions: {},
	initialize: function(_options) {
		var options = $merge(this.addOptions, _options);
		this.parent(options);
	}
});

MavBox.Media.Video = new Class({
	Extends: MavBox.Media,
	addOptions: {
		'ogg': null,
		'mp4': null,
		'poster': null,
		'flash': null,
		'alt': '',
		'title': 'No video playback capabilities, please download the video below'
	},
	"v4e": '<video width="640" height="360" poster="__POSTER__" controls><source src="__VIDEO_OGV__" type="video/ogg" /><source src="__VIDEO_MP4__" type="video/mp4" /><!--[if gt IE 6]>' + "\n" +
		   '<object width="640" height="375" classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B"><!' + "\n" + '[endif]--><!--[if !IE]><!-->' + "\n" +
		   '<object width="640" height="375" type="video/quicktime" data="__VIDEO__.mp4">' + "\n" + '<!--<![endif]-->' +
		   '<param name="src" value="__VIDEO__" /><param name="showlogo" value="false" /><object width="640" height="380" type="application/x-shockwave-flash" data="__FLASH__?image=__POSTER__&amp;file=__VIDEO_MP4__"><param name="movie" value="__FLASH__?image=__POSTER__&amp;file=__VIDEO__" /><img src="__POSTER__" width="640" height="360" alt="__ALT__" title="__TITLE__" /></object><!--[if gt IE 6]><!--></object><!--<![endif]--></video>',

	initialize: function(_options) {
		var options = $merge(this.addOptions, _options);
		this.parent(options);

	}
});
*/
