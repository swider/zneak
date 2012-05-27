//require(["js/ace/edit_session"], function(){ EditSession.prototype.$startWorker = function(){} });

require(["js/ace/ace.js","js/ace/mode-html.js","js/ace/mode-css.js","js/ace/mode-javascript.js","js/ace/theme-twilight.js","/faye.js"], function(util) {
	
	// Ace
	$(function(){
		var
			html = ace.edit("html"),
			css = ace.edit("css"),
			js = ace.edit("js");
		var HTMLMode = require("ace/mode/html").Mode;
		var CSSMode = require("ace/mode/css").Mode;
		var JavaScriptMode = require("ace/mode/javascript").Mode;
		html.getSession().setMode(new HTMLMode());
		css.getSession().setMode(new CSSMode());
		js.getSession().setMode(new JavaScriptMode());
		$.each([html,css,js], function(i,el){ el.setTheme("ace/theme/twilight"); });
		//prefill
		var $preview = $('iframe#preview').contents();
		html.getSession().getDocument().setValue($preview.find('body').html());
		css.getSession().getDocument().setValue($preview.find('head style').html());
		//js.getSession().getDocument().setValue($preview.find('script').html());
		js.getSession().getDocument().setValue("var hello = function(){ console.log('Hello World'); };");



		// Pub/Sub
		var client = new Faye.Client('/faye', {
			timeout: 120
		});
		$('#css').change(function(){
			//var publication = client.publish('/page/css', {css: css.getSession().getDocument().getValue() });
		});
		$('#html').change(function(){
			//var publication = client.publish('/page/html', {html: $(this).val()});
		});
		$('#js').change(function(){
			//var publication = client.publish('/page/js', {js: $(this).val()});
		});

		var sendUpdate = function(){ 
			var pubHTML = client.publish('/page/html', { html: html.getSession().getDocument().getValue() });
			var pubCSS = client.publish('/page/css', { css: css.getSession().getDocument().getValue() });
			var pubJS = client.publish('/page/js', { js: js.getSession().getDocument().getValue() });
		};

		$(document).on('body', 'keyup.Ctrl_s', sendUpdate);
		$("header h1").click(sendUpdate);



		// Resize Editor/Preview proportions
		var
			starty = 0,
			starth = 0,
			startt = 0,
			resize = false,
			$cols = $('.editor-col'),
			$previewContainer = $('#preview-container')
			$resizeCover = $('#preview-cover');
		$('#editor-divider').mousedown(function(e){
			starty = e.pageY;
			starth = $cols.height();
			startt = parseInt($previewContainer.css('top'));
			resize = true;
			$resizeCover.show(); //keeps mouse events on the parent, not the preview iframe
		}).mouseup(function(){
			resize = false;
			$resizeCover.hide();
		});
		$(document).mousemove(function(e){
			if(resize){
				$cols.height(starth + (e.pageY - starty) + 'px');
				$previewContainer.css('top', startt + (e.pageY - starty) + 'px');
				$.each([html,css,js], function(i,el){ el.resize(); });
			}
		});


		// Settings
		$("#toggleSettings").click(function(){
			$("#header-wrapper").toggleClass('showSettings');
			return false;
		});


	});
});