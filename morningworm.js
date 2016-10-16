// Utility functions

// is A the child of B?
function isChildOf(a, b) {
	if (b==null) {
		console.log("Called isChildOf with a null ancestor!");
		return;
	}
	while(a != null) {
		if (a==b)
			return true;
		a = a.parentNode;
	}
	return false;
}

// query by selector
function $s(selector) {
	return document.querySelectorAll(selector);
}

// query by selector, return first
function $o(selector) {
	return document.querySelector(selector);
}

// query by id
function $(id) {
	return document.getElementById(id);
}

function addClass(el, cls) {
	setClass(el, cls, true);
}

function removeClass(el, cls) {
	setClass(el, cls, false);
}

function setClass(el, cls, on) {
	var split = el.className.split(' ');

	var out = '';
	var already_has_cls = false;

	for (var i=0; i<split.length; i++) {
		if (split[i] == cls) {
			if (on) {
				already_has_cls = true;
			} else {
				continue;
			}
		}

		if (out != '') {
			out += ' '+split[i];
		} else {
			out = split[i];
		}
	}

	if (on && !already_has_cls) {
		if (out != '') {
			out += ' '+cls;
		} else {
			out = cls;
		}
	}

	el.className = out;
}

function assert(condition, message) {
	if (!condition) {
		message = 'Assertion failed' + ( message ? ': '+message : '' );
			if (window['Error'] !== undefined)
				throw new Error(message);
			throw message;
	}
}

function raise(message) {
	if (window['Error'] !== undefined)
		throw new Error(message);
	throw message;
}

// unix timestamp, floating-point with millisecond precision
function time() {
	return Date.now() / 1000.0;
}

function zeroPad(n, l) {
	n += '';
	while(n.length < l) {
		n = '0'+n;
	}
	return n;
}

function el(tag_name, attrs, kids) {
	var el = document.createElement(tag_name);

	if (attrs) {
		for (var key in attrs) {
			el[key] = attrs[key];
		}
	}

	if (kids) {
		for (var i=0; i<kids.length; i++) {
			el.appendChild(kids[i]);
		}
	}

	return el;
}

function tx(text) {
	return document.createTextNode(text);
}

function clear(node) {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
}

// The meat!

var tag_selectors = {};

function showingSpoilers() {
	return $('show_spoilers').checked;
}

function makeTagSelector(tag) {
	var checkbox = el(
		'input',
		{'type': 'checkbox', 'value': tag, 'onclick': updateResults}
	);

	tag_selectors[tag] = checkbox;

	var out = el(
		'label',
		{'className': 'tagSelectorBubble'},
		[
			checkbox,
			tx(' '+tag)
		]
	);

	if (mw_data.tag_definitions[tag] !== undefined) {
		out.title = mw_data.tag_definitions[tag];
	}

	return out;
}

function addTagSelectorsToSection(target, tags) {
	for (var i=0; i<tags.length; i++) {
		target.appendChild(makeTagSelector(tags[i]));
	}
}

function addTagSection(target, section) {
	var name = section[0];
	var desc = section[1];
	var tags = section[2];

	var header = el(
		'div',
		{'className': 'tagSelectorHeader'},
		[
			el('span', {'className': 'tagSelectorHeaderTitle'}, [tx(name)]),
			el('span', {'className': 'tagSelectorHeaderDescription'}, [tx(' '+desc)])
		]
	);

	target.appendChild(header);

	var selectors = el(
		'div',
		{'className': 'tagSelectorArea'}
	);

	addTagSelectorsToSection(selectors, tags);

	target.appendChild(selectors);
}

function addAllTagSections(target, sections) {
	for (var i=0; i<sections.length; i++) {
		addTagSection(target, sections[i]);
	}
}

function hasAllRequiredTags(tags, required_tags) {
	for (var i=0; i<required_tags.length; i++) {
		if (tags[required_tags[i]] !== true) {
			return false;
		}
	}
	return true;
}

function countMatchingStories(required_tags, stories, spoilers) {
	var out = 0;

	for (var i=0; i<stories.length; i++) {
		var tags;
		if (spoilers) {
			tags = stories[i].lookup_tags_spoilers;
		} else {
			tags = stories[i].lookup_tags;
		}

		if (hasAllRequiredTags(tags, required_tags)) {
			out += 1;
		}
	}

	return out;
}

function storyHeaderFor(story) {
	var out = el(
		'div',
		{'className': 'storyHeader'},
		[
			tx(story.id),
			tx(' ')
		]
	);

	out.innerHTML += story.title;

	return out;
}

function storyNavFor(story) {
	return el(
		'div',
		{'className': 'storyNavigation'},
		[
			el('a', {'href': story.sb}, [tx('SpaceBattles')]),
			tx(' '),
			el('a', {'href': story.sv}, [tx('Sufficient Velocity')]),
		]
	);
}

function storyDescriptionFor(story) {
	var p = el(
		'p',
		{'className': 'storyDescription'}
	);
	p.innerHTML = story.desc;
	return p;
}

function storyTagsFor(story) {
	var out = el('div', {'className': 'storyTags'});

	var tags;
	if (showingSpoilers()) {
		tags = story.visible_spoiler_tags;
	} else {
		tags = story.visible_tags;
	}

	for (var i=0; i<tags.length; i++) {
		out.appendChild(el('span', {'className': 'tagBubble'}, [tx(tags[i])]));
	}

	return out;
}

function addStory(target, story, required_tags) {
	var is_match;
	if (showingSpoilers()) {
		is_match = hasAllRequiredTags(story.lookup_tags_spoilers, required_tags);
	} else {
		is_match = hasAllRequiredTags(story.lookup_tags, required_tags);
	}

	var class_name = (
		is_match
			? 'resultStory resultMatchStory'
			: 'resultStory resultNoMatchStory'
	);

	target.appendChild(el(
		'div',
		{'className': class_name},
		[
			storyHeaderFor(story),
			storyNavFor(story),
			storyDescriptionFor(story),
			storyTagsFor(story)
		]
	));
}

function addResult(target, series, required_tags) {
	var stories = el('div', {'className': 'resultStories'});

	for (var i=0; i<series.stories.length; i++) {
		addStory(stories, series.stories[i], required_tags);
	}

	if (series.thread_sb && series.thread_sv) {
		stories.appendChild(
			el(
				'div',
				{'className': 'resultThread'},
				[
					tx('Continued in its own thread on '),
					el('a', {'href': series.thread_sb}, [tx('SpaceBattles')]),
					tx(' and '),
					el('a', {'href': series.thread_sv}, [tx('Sufficient Velocity')])
				]
			)
		);
	}

	target.appendChild(el(
		'div',
		{'className': 'resultSeries'},
		[
			el('div', {'className': 'resultSeriesTitle'}, [tx(series.name)]),
			stories
		]
	));
}

function addAllResults(target, all_series, required_tags) {
	for (var i=0; i<all_series.length; i++) {
		addResult(target, all_series[i], required_tags);
	}
}

function updateResults() {
	var required_tags = [];
	for (var tag in tag_selectors) {
		if (tag_selectors[tag].checked) {
			required_tags.push(tag);
		}
	}

	var selected_series = [];
	var shown_chapters = 0;
	var shown_with_spoilers = 0;

	for (var i=0; i<mw_data.series.length; i++) {
		var tags, series=mw_data.series[i];
		if (showingSpoilers()) {
			tags = series.lookup_tags_spoilers;
		} else {
			tags = series.lookup_tags;

			if (hasAllRequiredTags(series.lookup_tags_spoilers, required_tags)) {
				shown_with_spoilers += countMatchingStories(
					required_tags,
					series.stories,
					true
				);
			}
		}

		var does_match = hasAllRequiredTags(tags, required_tags);
		if (does_match) {
			selected_series.push(mw_data.series[i]);
			shown_chapters += countMatchingStories(
				required_tags,
				series.stories,
				showingSpoilers()
			);
		}
	}

	clear($('info_text'));

	if (shown_chapters == 0) {
		$('info_text').appendChild(tx('No chapters matched your selections.'));
	} else if(shown_chapters == 1) {
		$('info_text').appendChild(tx('1 chapter matched your selections.'));
	} else {
		$('info_text').appendChild(
			tx(shown_chapters + ' chapters matched your selections.')
		);
	}

	if (shown_with_spoilers > shown_chapters) {
		var diff = shown_with_spoilers - shown_chapters;

		var text;
		if (diff == 1) {
			text = ' Turning on spoilers would reveal 1 more chapter.';
		} else {
			text = ' Turning on spoilers would reveal '+diff+' more chapters.';
		}

		$('info_text').appendChild(el(
			'span',
			{'className': 'spoiler'},
			[tx(text)]
		));
	}

	clear($('results'));

	if (selected_series.length < 1) {
		$('results').style.display = 'none';
	} else {
		$('results').style.display = 'block';
		addAllResults($('results'), selected_series, required_tags);
	}
}

window.onload = function() {
	$('dynamic').style.display='block';
	$('loading').style.display='none';

	$('show_spoilers').onchange = updateResults;

	addAllTagSections($('tag_select'), mw_data.tag_sections);

	updateResults();
};
