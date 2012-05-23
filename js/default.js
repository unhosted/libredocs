var lp = {"locales":[{"id":"en","name":"english"},{"id":"fr","name":"french"}]};

lp = $.extend(lp, {

	/**
	 * Actual user locale
	 */
	locale: 'en',

	/**
	 * Translation dictionaries
	 */
	dictionaries: {},

	setLocale: function(locale) {
		if (!locale) {
			locale = $.cookie('locale');
		}
		if (!locale) {
			locale = window.navigator.language ? window.navigator.language : window.navigator.userLanguage;
		}

		if (locale != lp.locale) {
			$.cookie('locale', locale);
			lp.locale = locale;

			$.each(lp.locales, function(lidx, availableLocale) {
				if (locale.indexOf(availableLocale.id) != -1 || !locale.indexOf(availableLocale.name != -1)) {
					$('#locale a').removeClass('selected');
					$('#lang-' + availableLocale.id).addClass('selected');
					lp.translateTo(availableLocale.id);
				}
			} );
		}
	},

	getDictionary: function(locale) {
		$.getJSON('js/locales/' + locale + '.json', function(dictionary) {
			lp.dictionaries[locale] = dictionary;
			lp.translateTo(locale);
		} );
	},

	translateTo: function(locale, $from) {
		if (!locale) {
			return;
		}

		if (typeof lp.dictionaries[locale] == 'undefined') {
			lp.getDictionary(locale);
			return;
		}

		var $toTranslate = $from ? $from.find('.translatable') : $('.translatable');
		$toTranslate.each(function(idxe, element) {
			var $element = $(element);
			var translation = '';

			if (typeof lp.dictionaries[locale][$element.data('translatable')] == 'string') {
				translation = lp.dictionaries[locale][$element.data('translatable')];
			} else {
				translation = $element.data('translatable');
			}
			if ($element.html()) {
				$element.html(translation);
			}
			// need i18n
//			if ($element.data('text')) {
//				$element.data('text', translation);
//			}
		} );
	},

	initTranslation: function($from) {
		var $toInit = $from ? $from.find('.translatable') : $('.translatable');
		$toInit.each(function(idxe, element) {
			var $element = $(element);
			$element.data('translatable', $element.html().replace(/"/g, '\''));
		} );
	},
	
} );

$(document).ready(function() {

	// Create translations availables
	var $locale = $('#locale');
	$.each(lp.locales, function(lidx, locale) {
		var $li = $('<li />');
		var $a = $('<a href="#" id="lang-' + locale.id + '" />')
			 .html('<img src="images/countries/' + locale.id + '.png" alt="' + locale.name + ' flag" />')
			 .click(function() {
				 lp.setLocale(locale.id);
				 return false;
			 } )
			 .appendTo($li);
		$li.appendTo($locale);
	} );


	lp.initTranslation();
	lp.setLocale();

} );