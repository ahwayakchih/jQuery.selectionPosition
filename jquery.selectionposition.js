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
			var id = $(this).attr('id');
			if (!id) {
				id = $(this).attr('name');
				if (!id) {
					id = String(new Date().getTime()) + String(Math.random()).replace('0.', '');
				}
				$(this).attr('id', id);
			}

			// This has to go first because Firefox seems to screw up (ignores our setSelectionRange below) otherwise.
			if ($(this).hasClass('debug')) {
				var z = $(this).css('z-index');
				if (z == 'auto') z = 10; // TODO: check what z-index is in different browsers. Chrome gives 0 by default. FF and Opera set it to "auto", whatever that means :(.

				var p = $(this).css('position');
				if (p == 'static') p = 'relative';
				$(this).css({'z-index': Math.max(10, z), 'position': p});
			}

			// Mozilla/Firefox (3.6.7 linux/ubuntu only?) does not support nowrap.
			if (this.nodeName == 'TEXTAREA' && $(this).css('white-space') == 'nowrap' && $.browser.mozilla) {
				isWrap = true;
				var css = {'white-space': 'pre-wrap', 'word-wrap': 'break-word'};
				$(this).css(css);
			}

			// This is first time we're focused. Browsers seem to always go to end of text, when focus is done with keyboard (TAB key :).
			// But they don't automatically scroll content to selectionStart. So we end up with selectionStart at the end of text that is out of 
			// visible area and popup showing up out of place. That is why we have to move selectionStart to beginning of text.
			// If user focused area with a click in the middle of text, selectionStart will be:
			// = 0 in Chrome
			// = point at which user clicked in Opera
			// = length of text value in Firefox
			// TODO: Fix Firefox which will always catch this, even when user clicks inside area to select some text in the middle :(
			if (this.selectionStart >= $(this).val().length) this.setSelectionRange(0,0);

			var exists = $('div#'+id+'_calculator');
			if (!exists || exists.length < 1) {
				$(this).before($('<div class="_calculator" id="'+id+'_calculator"></div>'));
				$('div#'+id+'_calculator').css({'position': 'absolute', 'z-index' : '0', 'top': 0, 'left': -9000});
			}

			$(this).addClass('selectionPosition-ready');
		},
		start: function(){
			if (!$(this).hasClass('selectionPosition-ready')) selectionPosition.construct.call(this);

			var style = {};
			for (a in {'width':'', 'height':'', 'border-left-width':'', 'border-top-width':'', 'border-left-style':'', 'border-top-style':'', 'border-right-width':'', 'border-bottom-width':'', 'border-right-style':'', 'border-bottom-style':'', 'padding-top':'', 'padding-left':'', 'padding-bottom':'', 'padding-right':'', 'font-size':'', 'font-family':'', 'font-weight':'', 'font-style':'', 'font-variant':'', 'letter-spacing':'', 'line-height':'', 'vertical-align':'', 'text-align':'', 'text-indent':'', 'text-decoration':'', 'text-transform':'', 'white-space':'', 'word-spacing':''}) {
				style[a] = $(this).css(a);
			}

			$('div#'+$(this).attr('id')+'_calculator').html($(this).val().replace(/\n/g, '<br />')).css(style);

			// Calculate margin, which will handle border and padding widths for us.
			// That way we don't have to add them to offset every time we calculate popup's position.
			style = {};
			style['margin-top'] = (($(this).css('border-top-width').replace('px','') * 1) + ($(this).css('padding-top').replace('px','') * 1)) + 'px';
			style['margin-left'] = (($(this).css('border-left-width').replace('px','') * 1) + ($(this).css('padding-left').replace('px','') * 1)) + 'px';
			$('div#'+$(this).attr('id')+'_popup').css(style);

			if ($(this).hasClass('debug')) {
				$('div#'+$(this).attr('id')+'_calculator').css($(this).offset());
			}
		},
		calculate: function(data){
			var text = $(this).val();

			if (!data || isNaN(data.start)) {
				data = {
					start: this.selectionStart,
					end: this.selectionEnd,
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
			var id = 'div#'+$(this).attr('id')+'_calculator';

			var isWrap = ($(this).css('white-space') != 'nowrap' && this.nodeName == 'TEXTAREA' ? true : false);

			var x = 0;
			var y = 0;
			if (!isWrap) {
				// Nowrap areas are easy to calculate with div's width and height set to auto

				// If editedWordPre is empty add &nbsp; to get minimum height for 1 line.
				// Also replace new lines with <br/> :).
				$(id).html((data.editedWordPre.length < 1 ? data.pre+'&nbsp;' : data.pre).replace(/\n/g, '<br />')).width('auto').height('auto');
				y = $(id).height();

				// Get width of line without editedWordPre part (we want to show popup at the beginning of the word, not at the cursor/carriage point)
				x = $(id).html(data.editedLinePre.substr(0, data.editedLinePre.length - data.editedWordPre.length)).width();

				// Only WebKit (at least Chromium linux/ubuntu) has scrollLeft updated for INPUT fields :(
				// We could try to calculate difference between auto and hardcoded widths, but there is no way to know point of edit in input field.
				// So we can have general idea which part of text is visible, but we'll not know exactly the place, because text may be scrolled and 
				// point may be at the beginning (when text was scrolled to end and user scrolls it back to beginning), in the middle or at the end
				// (when user is scrolling it to end).
				if (this.nodeName == 'INPUT' && !$.browser.webkit) {
					//var x2 = $(id).css({'width': $(this).width(), 'white-space': 'nowrap'}).width();
					//if (x2 < x) x -= x2;
					// TODO: find a way to support INPUT fields in browsers other than webkit-based.
					x = 0;
				}
			}
			else {
				// Wrapping areas are a lot more tricky so they take a lot more CPU time

				// If editedWordPre is empty add &nbsp; to get minimum height for 1 line.
				// If editedWordPost is not empty, add it instead of &nbsp; 
				// so popup will not cover line in case where pre could fit in previous line, but with post it won't,
				// e.g., "line of text" is split into "line of" and "text", but "line of te" is not split.
				// So without using editedWordPost, we would make popup stay at first line, instead of going to 2nd.
				// Also replace new lines with <br> :).
				// Use min of this.scrollWith and this.width(). When scrollbar is visible, scrollWidth is smaller than width.
				$(id).html((data.editedWordPre.length < 1 ? data.pre+(data.editedWordPost.length > 0 ? data.editedWordPost : '&nbsp;') : data.pre + data.editedWordPost).replace(/\n/g, '<br />')).width(Math.min(this.scrollWidth, $(this).width())).height('auto');
				y = $(id).height();

				// Now we need to:
				// 1. Get "real line"
				// 2. Start loop and cut off last words from it and check height of what's left.
				// 3. Loop until height of what's left is changed between loops.
				//    That will mean that what's left are pseudo-lines (or just one such line) before last pseudo-line.
				// 4. Just get width of last pseudo-line and we're done :).
				var pseudoLines = data.editedLinePre + data.editedWordPost;
				$(id).html(pseudoLines);
				var h = $(id).height();
				var pseudoLinesPre = pseudoLines;
				while (pseudoLinesPre.length > 0) {
					pseudoLinesPre = pseudoLines.replace(/[^\s]+\s*$/, '');
					// Break if we can't cut off anything more
					if (pseudoLinesPre.length == pseudoLines.length) break;

					// Break if height changed (meaning that we just found out what part of text is last of pseudo-lines)
					if (h != $(id).html(pseudoLinesPre).height()) break;

					pseudoLines = pseudoLinesPre;
				}

				x = $(id).html(data.editedLinePre.substr(pseudoLinesPre.length, data.editedLinePre.length - data.editedWordPre.length - pseudoLinesPre.length)).width('auto').width();
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
