/*!
 * jQuery selectionPosition Library v1.0
 *
 * Copyright 2011, Marcin Konicki
 * Released under the MIT license.
 *
 */

// TODO: calculate() should support CSS:direction property (are different directions written different way in textarea and input fields?).

(function($){

	var selectionPosition = {
		construct: function(){
			var field = $(this),
				id = field.attr('id');

			if (!id) {
				id = field.attr('name');
				if (!id) {
					id = String(new Date().getTime()) + String(Math.random()).replace('0.', '');
				}
				field.attr('id', id);
			}

			// This has to go first because Firefox seems to screw up (ignores our setSelectionRange below) otherwise.
			if (field.hasClass('debug')) {
				var z = field.css('z-index');
				if (z == 'auto') z = 10; // TODO: check what z-index is in different browsers. Chrome gives 0 by default. FF and Opera set it to "auto", whatever that means :(.

				var p = field.css('position');
				if (p == 'static') p = 'relative';
				field.css({'z-index': Math.max(10, z), 'position': p});
			}

			// Mozilla/Firefox (3.6.7 linux/ubuntu only?) does not support nowrap.
			if (this.nodeName == 'TEXTAREA' && field.css('white-space') == 'nowrap' && $.browser.mozilla) {
				field.css({'white-space': 'pre-wrap', 'word-wrap': 'break-word'});
			}

			// This is first time we're focused. Browsers seem to always go to end of text, when focus is done with keyboard (TAB key :).
			// But they don't automatically scroll content to selectionStart. So we end up with selectionStart at the end of text that is out of 
			// visible area and popup showing up out of place. That is why we have to move selectionStart to beginning of text.
			// If user focused area with a click in the middle of text, selectionStart will be:
			// = 0 in Chrome
			// = point at which user clicked in Opera
			// = length of text value in Firefox
			// TODO: Fix Firefox which will always catch this, even when user clicks inside area to select some text in the middle :(
			if (this.selectionStart >= field.val().length) this.setSelectionRange(0,0);

			var exists = $('div#'+id+'_calculator');
			if (!exists || exists.length < 1) {
				field.before($('<div class="_calculator" id="'+id+'_calculator"></div>'));
				$('div#'+id+'_calculator').css({'position': 'absolute', 'z-index' : '0', 'top': 0, 'left': -9000});
			}

			field.addClass('selectionPosition-ready');
		},
		start: function(){
			var field = $(this);

			if (!field.hasClass('selectionPosition-ready')) selectionPosition.construct.call(this);

			var style = {};
			for (a in {'width':'', 'height':'', 'border-collapse':'', 'border-left-width':'', 'border-top-width':'', 'border-left-style':'', 'border-top-style':'', 'border-right-width':'', 'border-bottom-width':'', 'border-right-style':'', 'border-bottom-style':'', 'padding-top':'', 'padding-left':'', 'padding-bottom':'', 'padding-right':'', 'font-size':'', 'font-family':'', 'font-weight':'', 'font-style':'', 'font-variant':'', 'letter-spacing':'', 'line-height':'', 'vertical-align':'', 'text-align':'', 'text-indent':'', 'text-decoration':'', 'text-transform':'', 'white-space':'', 'word-spacing':''}) {
				style[a] = field.css(a);
			}

			$('div#'+field.attr('id')+'_calculator').html(field.val()).css(style);

			// Calculate margin, which will handle border and padding widths for us.
			// That way we don't have to add them to offset every time we calculate popup's position.
			style = {};
			style['margin-top'] = ((field.css('border-top-width').replace('px','') * 1) + (field.css('padding-top').replace('px','') * 1)) + 'px';
			style['margin-left'] = ((field.css('border-left-width').replace('px','') * 1) + (field.css('padding-left').replace('px','') * 1)) + 'px';
			$('div#'+field.attr('id')+'_popup').css(style);

			if (field.hasClass('debug')) {
				$('div#'+field.attr('id')+'_calculator').css(field.position());
			}
		},
		calculate: function(data){
			var field = $(this),
				cal = $('div#'+field.attr('id')+'_calculator');

			if (!data || isNaN(data.start)) {
				var text = field.val(),
					selection = field.selectionRange();

				data = {
					start: selection.start,
					end: selection.end,
					pre: '',
					post: '',
					editedWordPre: '',
					editedWordPost: '',
					editedLinePre: ''
				};
				data.pre = text.substr(0, data.start);
				data.end = data.end - data.start;
				data.post = (data.end > 0 ? text.substr(data.start, data.end) : text.substr(data.start));

				data.editedWordPre = data.pre.match(/[^\s]+$/);
				data.editedWordPre = (data.editedWordPre && data.editedWordPre.length > 0 ? data.editedWordPre[0] : '');

				data.editedWordPost = data.post.match(/^[^\s]+/);
				data.editedWordPost = (data.editedWordPost && data.editedWordPost.length > 0 ? data.editedWordPost[0] : '');

				data.editedLinePre = data.pre.match(/[^\n]+$/);
				data.editedLinePre = (data.editedLinePre && data.editedLinePre.length > 0 ? data.editedLinePre[0] : '');
			}

			// Now we can calculate stuff :).
			var isWrap = (field.css('white-space') != 'nowrap' && this.nodeName == 'TEXTAREA' ? true : false);

			var x = 0;
			var y = 0;
			if (!isWrap) {
				// Nowrap areas are easy to calculate with div's width and height set to auto
				cal.css('white-space', 'nowrap');

				// If editedWordPre is empty add &nbsp; to get minimum height for 1 line.
				// Also replace new lines with <br/> :).
				cal.html((data.editedWordPre.length < 1 ? data.pre+'&nbsp;' : data.pre).replace(/\n/g, '<br />')).width('auto').height('auto');
				y = cal.height();

				// Get width of line without editedWordPre part (we want to show popup at the beginning of the word, not at the cursor/carriage point)
				x = cal.html(data.editedLinePre.substr(0, data.editedLinePre.length - data.editedWordPre.length)).width();

				// Only WebKit (at least Chromium linux/ubuntu) has scrollLeft updated for INPUT fields :(
				// We could try to calculate difference between auto and hardcoded widths, but there is no way to know point of edit in input field.
				// So we can have general idea which part of text is visible, but we'll not know exactly the place, because text may be scrolled and 
				// point may be at the beginning (when text was scrolled to end and user scrolls it back to beginning), in the middle or at the end
				// (when user is scrolling it to end).
				if (this.nodeName == 'INPUT' && !$.browser.webkit) {
					//var x2 = cal.css({'width': $(this).width(), 'white-space': 'nowrap'}).width();
					//if (x2 < x) x -= x2;
					// TODO: find a way to support INPUT fields in browsers other than webkit-based.
					x = 0;
				}
			}
			else {
				// Wrapping areas are a lot more tricky so they take a lot more CPU time
				cal.css('white-space', 'pre-wrap');

				// If editedWordPre is empty add &nbsp; to get minimum height for 1 line.
				// If editedWordPost is not empty, add it instead of &nbsp; 
				// so popup will not cover the line in case where pre could fit in previous line, but with post it won't,
				// e.g., "line of text" is split into "line of" and "text", but "line of te" is not split.
				// So without using editedWordPost, we would make popup stay at first line, instead of going to 2nd.
				var word = data.editedWordPre + data.editedWordPost;
				if (word.length < 1) word = '&nbsp;';

				// Wrap whole word with span, so we can get span.left. If word is wraped to next line, we will get x=0.
				// Use Math.min of this.scrollWith and this.width(). When scrollbar is visible, scrollWidth is smaller than width.
				// On Firefox (3.6.17, Ubuntu 10.04) our calculator and textarea have a tiny bit different text width. No idea why :(.
				var mod = ($.browser.mozilla ? -2 : 0);
				cal.html((data.editedWordPre.length > 0 ? data.pre.substr(0, data.pre.length - data.editedWordPre.length) : data.pre) + '<span>' + word + '</span>').width(Math.min(this.scrollWidth, field.width())+mod).height('auto');

				var span = cal.find('span');
				if (span && span.length > 0) {
					var pos = span.position();
					x = pos.left;
				}

				y = cal.height();
			}

			data.left = (x - this.scrollLeft);
			data.top = (y - this.scrollTop);

			return data;
		},
		stop: function(){
			// Nothing here anymore
		},
		destruct: function(){
			hints.stop.call(this);
			$(this).removeClass('selectionPosition-ready');
			$('div#'+$(this).attr('id')+'_calculator').remove();
		}
	};

	// If start and end are null, then it returns selection range object.
	// If start and end are numbers, then it selects text.
	$.fn.selectionRange = function(start, end) {
		var elem = this[0];
		if (!elem || !elem.ownerDocument) {
			return null;
		}

		// Get range
		if (isNaN(start) && isNaN(end)) {
			// Fix/Workaround Opera (10.60 and 11.11 linux/ubuntu only?) bug
			// It seems to count every \n as 2 characters instead of one, even tough there is only one character there (no \n\r or anything like that).
			// Even more! count will break at the end of line, earlier with each NL before it. Like it was starting to count next new line (after selectionStart)
			// earlier every line. First line is ok, 2nd starts 1 char earlier and end one char earlier, 3rd 2 chars earlier, etc...
			// When we add count new lines it fixes beginning of line, but we still get cut off line at the end. There is "jump" char at the end that is not counted
			// (or at which next new line starts being counted?).
			// It is like there were two "frames" in memory. One with real text, and other, which is virtual, that counts every \n twice.
			// With each \n they are more and more misaligned. That would explain why "jumpy" character moves to the beginning of line with every new line.
			// Update: more info at http://dev.opera.com/forums/topic/488381
			//         Looks like Opera internally always uses \r\n, but text accessed by JavaScript uses \n.
			//         That is why selectionStart & selectionEnd are different than one could assume by reading text :(.
			//         Some additional explanations here too: http://lists.whatwg.org/pipermail/whatwg-whatwg.org/2011-January/029669.html
			if ($.browser.opera) {
				// First get whole value and replace every new line with our unlikely to happen string that has length equal 2
				// (because Opera's selectionStart/End calculator seems to count every new line as two characters, even tough
				// all other functions like text.length, replace, match, etc... count them correctly as one character).
				var text = $(elem).val().replace(/\r?\n/g, '');

				// Now use Opera's incorrect selectionStart to get correct part of value and then put back new line characters and strip any leftovers :).
				var pre = text.substr(0, elem.selectionStart).replace(//g, "\n").replace(//g, '');

				// Same for "next characters after selectionStart but before any white space" variable.
				var post = text.substr(0, elem.selectionEnd).replace(//g, "\n").replace(//g, '');

				return {
					start: pre.length,
					end: post.length
				}
			}
			else {
				return {
					start: elem.selectionStart,
					end: elem.selectionEnd
				}
			}
		}
		// Set range
		else {
			if (typeof start == 'object' && (!isNaN(start.start) || !isNaN(start.end))) {
				end = start.end ? start.end : start.start;
				start = start.start;
			}

			if (isNaN(start)) start = 0;
			if (isNaN(end)) {
				end = start;
			}

			// Workaround Opera's bug (read above for more info)
			if ($.browser.opera) {
				var text = $(elem).val().replace(/\r\n/g, "\n"),
					pre = text.substr(0, start).replace(/\n/g, ''),
					post = text.substr(0, end).replace(/\n/g, '');

				elem.setSelectionRange(pre.length, post.length);
			}
			else {
				elem.setSelectionRange(start, end);
			}
		}
	}

	$.fn.selectionPosition = function(clearCache, data) {
		var elem = this[0];
		if (!elem || !elem.ownerDocument) {
			return null;
		}

		var t = $(elem).position();

		if (clearCache) selectionPosition.start.call(elem);
		var s = selectionPosition.calculate.call(elem, data);

		s.left = Math.max(t.left, t.left + s.left);
		s.top += t.top;

		return s;
	}

	$.fn.selectionOffset = function(clearCache, data) {
		var elem = this[0];
		if (!elem || !elem.ownerDocument) {
			return null;
		}

		var t = $(elem).offset();

		if (clearCache) selectionPosition.start.call(elem);
		var s = selectionPosition.calculate.call(elem, data);

		s.left = Math.max(t.left, t.left + s.left);
		s.top += t.top;

		return s;
	}

})(jQuery);
