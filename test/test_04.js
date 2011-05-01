$(document).ready(function() {
	var hints = {
		construct: function(){
			var id = $(this).attr('id');
			if (!id) {
				id = $(this).attr('name');
				if (!id) {
					id = String(new Date().getTime()) + String(Math.random()).replace('0.', '');
				}
				$(this).attr('id', id);
			}
			var exists = $('div#'+id+'_popup');
			if (!exists || exists.length < 1) {
				$(this).before($('<div class="_popup" id="'+id+'_popup"></div>'));
				$('div#'+id+'_popup').css({'position': 'absolute', 'z-index': '99'}).hide();
			}
			$(this).addClass('hints-ready').unbind('focus', hints.start).bind('focus', hints.start);
		},
		start: function(){
			$(this).selectionOffset(); // start also selection calculator

			if (!$(this).hasClass('hints-ready')) hints.construct.call($(this));
			$(this).bind('keyup', hints.process).bind('blur', hints.stop);
		},
		process: function(){
			var o = $(this).selectionOffset(true);
			$('div#'+$(this).attr('id')+'_popup').css(o).html(this.scrollLeft+' pre: '+o.editedLinePre+'<br />edited: '+o.editedWordPre+'<br />post: '+o.editedWordPost).slideDown('fast');
		},
		stop: function(){
			$(this).unbind('keyup', hints.process).unbind('blur', hints.stop);
			$('div#'+$(this).attr('id')+'_popup').slideUp('fast');
		},
		destruct: function(){
			hints.stop.call($(this));
			$(this).unbind('focus', hints.start).removeClass('hints-ready');
			$('div#'+$(this).attr('id')+'_popup').remove();
		}
	};

	// If enabled is empty, returns current state of enabled.
	jQuery.fn.hints = function(enabled, options) {
		if (undefined == enabled) {
			return $(this).hasClass('hints-ready');
		}
		else if (enabled == true) {
			return $(this).each(function() {
				if (!$(this).hasClass('hints-ready')) hints.construct.call(this);
				$(this).bind('focus', hints.start);
			});
		}
		else {
			return this.each(function() {
				hints.destruct.call(this);
			});
		}
	};

	$('textarea.hints:not(.hints-ready)').live('focus', function(){
		$(this).hints(true).focus();
	});

	$('input[type=text].hints:not(.hints-ready)').live('focus', function(){
		$(this).hints(true).focus();
	});
});
