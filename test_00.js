$(document).ready(function() {


	$('textarea.hints:not(.hints-processed)').live('focus', function(){
		var id = $(this).attr('id');
		if (!id) {
			id = $(this).attr('name');
			if (!id) {
				id = String(new Date().getTime()) + String(Math.random()).replace('0.', '');
			}
			$(this).attr('id', id);
		}

		var orig = $(this).val();

		//$(this).css({'z-index': '5'});
		//$(this).css({'white-space': 'nowrap'});

		// Disabling word wrap seems to make browser change every new line character into space character,
		// but later 

		$(this).before($('<div class="_calculator" id="'+id+'_calculator"></div>'));
		$(this).before($('<div class="_popup" id="'+id+'_popup"></div>'));

		$('div#'+id+'_calculator').css({'position': 'absolute', 'z-index' : '0'});
		$('div#'+id+'_popup').css({'position': 'absolute', 'z-index': '99'}).hide();

		$(this).addClass('hints-processed');
	});

	$('textarea.hints').live('focus', function(){
		var style = {};
		for (a in {'width':'', 'height':'', 'border-left-width':'', 'border-top-width':'', 'border-left-style':'', 'border-top-style':'', 'border-right-width':'', 'border-bottom-width':'', 'border-right-style':'', 'border-bottom-style':'', 'padding-top':'', 'padding-left':'', 'padding-bottom':'', 'padding-right':'', 'font-size':'', 'font-family':'', 'font-weight':'', 'font-style':'', 'font-variant':'', 'letter-spacing':'', 'line-height':'', 'vertical-align':'', 'text-align':'', 'text-indent':'', 'text-decoration':'', 'white-space':'', 'word-spacing':''}) {
			style[a] = $(this).css(a);
		}

		$('div#'+$(this).attr('id')+'_calculator').html($(this).val().replace(/\n/g, '<br />')).css($(this).offset()).css(style).width($(this).width()).height($(this).height());
	}).live('keyup', function() {
		var id = 'div#'+$(this).attr('id')+'_calculator';

		var offset = $(this).offset();
		offset.left += parseFloat($(this).css('border-left-width').replace('px', ''));
		offset.top += parseFloat($(this).css('border-top-width').replace('px', ''));

		// We have to call it again because simple "poffset = offset" will just make it point to offset, instead of cloning object.
		var poffset = $(this).offset();
		poffset.left = offset.left - this.scrollLeft;
		poffset.top = offset.top - this.scrollTop;

		var pos = this.selectionStart;
		var text = $(this).val();

		var pre = text.substr(0, pos);
		var post = text.substr(pos).match(/^[^\s]+/);

		// Fix/Workaround Opera (10.60) bug
		// It seems to count every \n as 2 characters instead of one, even tough there is only one character there (no \n\r or anything like that).
		// Even more! count will break at the end of line, earlier with each NL before it. Like it was starting to count next new line (after selectionStart)
		// earlier every line. First line is ok, 2nd starts 1 char earlier and end one char earlier, 3rd 2 chars earlier, etc...
		// When we add count new lines it fixes beginning of line, but we still get cut off line at the end. There is "jump" char at the end that is not counted
		// (or at which next new line starts being counted?).
		// It is like there were two "frames" in memory. One with real text, and other which is virtual and counts every \n twice.
		// With each \n they are more and more misaligned. That would explain why "jumpy" character moves to the beginning of line with every new line.
		if ($.browser.opera) {
			// First get whole value and replace every new line with our unlikely to happen string that has length equal 2
			// (because Opera's selectionStart/End calculator seems to count every new line as two characters).
			pre = post = text.replace(/\n/g, '');
			// Now use Opera's incorrect selectionStart to get correct part of value and then put back new line characters and strip any leftovers :).
			pre = pre.substr(0, pos).replace(//g, "\n").replace(//g, '');

			// Same for "next characters after selectionStart but before any white space" variable.
			post = post.substr(pos).replace(//g, "\n").replace(//g, '');
			post = post.match(/^[^\s]+/);
		}

		var lastLine = pre.match(/[^\n]*$/);
		if (lastLine && lastLine.length > 0) {
			lastLine = lastLine[0];
		}
		else lastLine = '';

		if (lastLine == '') pre += '&nbsp;'; // Add empty space, so empty line (beginning of the line) will still give us height in pixels.
		pre = pre.replace(/\n/g, '<br />');

		var editedWord = lastLine.match(/[^\s]+$/);
		if (editedWord && editedWord.length > 0) editedWord = editedWord[0];
		else editedWord = '';

		if (post && post.length > 0) post = post[0];
		else post = '';

		// "lastLine" will give us X position (in pixels) of current selectionStart.
		// "lastLine.substr(0, lastLine.length - editedWord.length)" will give us X position (in pixels) of word at selectionStart.
		lastLine = lastLine.substr(0, lastLine.length - editedWord.length);

		$(id).html(lastLine + ' ').width('auto').height('auto');
		poffset.left += $(id).width();
		$(id).html(pre);
		poffset.top += $(id).height();

		if (poffset.left < offset.left) poffset.left = offset.left;
		if (poffset.top < offset.top) poffset.top = offset.top;

		if (poffset.left > this.scrollWidth) {
			// Oops, we have auto wrapping textarea! Use some very heavy voodoo to workaround that.
			// Set area width to that of textarea width so it also will wrap text automatically, just like textarea.
			$(id).html(pre).width(this.scrollWidth);
			// Get current height (containing all wrapped text)
			var fullH = $(id).height();
			poffset.top = offset.top - this.scrollTop + fullH;
			// Remove words from the end, until height changes, so we know which pseudo-line is last.
			$(id).html(lastLine + ' ' + editedWord);
			var lineH = $(id).height();
			var tmp = lineH;
			var tmpLine = String(lastLine + editedWord + post);
			var tmpLinePre = String(tmpLine);
			while (lineH == tmp) {
				tmpLinePre = tmpLine.replace(/[^\s]+\s*$/, '');
				if (tmpLinePre.length < 1 || tmpLinePre == tmpLine) {
					break;
				}
				tmpLine = tmpLinePre;
				$(id).html(tmpLine + '&nbsp;');
				tmp = $(id).height();
			}

			if (tmp != lineH) {
				poffset.left = offset.left - this.scrollLeft;
				// Now we know what's before last pseudo-line, so we can calculate X position
				$(id).html(lastLine.replace(tmpLine, '')).width('auto');
				poffset.left += $(id).width();
				// Now set poffset correctly
				//poffset.top += tmp;
			}
		}

		$('div#'+$(this).attr('id')+'_popup').css(poffset).html('pre: '+lastLine+'<br />edited: '+editedWord+'<br />post: '+post).slideDown();
	}).live('blur', function(){
		var id = $(this).attr('id');
		$('div#'+id+'_calculator').html($(this).val().replace(/\n/g, '<br />')).width($(this).width()).height($(this).height());
		$('div#'+id+'_popup').slideUp('fast');
	});
});
