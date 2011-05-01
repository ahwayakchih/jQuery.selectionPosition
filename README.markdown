# jQuery selectionPosition

- Version: 1.0
- Author: Marcin Konicki (http://ahwayakchih.neoni.net)
- Build Date: 01 May 2011
- Requirements: jQuery 1.4.2 or later

## Overview

This plugin adds two functions `selectionPosition()` and `selectionOffset()` that work on TEXTAREA and INPUT elements.
Each of them returns object with data describing selection in first matched element.

	return {
		left: X,
		top: Y,
		editedLinePre: part-of-line-that-precedes-selectionStart,
		editedWordPre: part-of-word-that-precedes-selectionStart,
		editedWordPost: part-of-word-that-follows-selectionStart
	};

## Usage

	var offset = $('textarea#check-this-one').selectionOffset();
	$('div#popup').css(offset);

## Changelog

- **1.0** Initial release.



