(function(){
	$(function(){
		
		// Page Info
		var pageId = zneak.page.pageId;
		$.each(zneak.page.docs, function(i, el){

		});


		// Ace
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
		setTimeout(function(){
			var $preview = $('iframe#preview').contents();
			html.getSession().getDocument().setValue($preview.find('body').html());
			css.getSession().getDocument().setValue($preview.find('head style').html());
				//js.getSession().getDocument().setValue($preview.find('script').html());
			js.getSession().getDocument().setValue("var hello = function(){ console.log('Hello World'); };");
		}, 100);

		//html.commands.addCommands([{
		//	name: "gotoline",
		//	bindKey: {win: "Ctrl-G", mac: "Command-G"},
		//	exec: function(editor, line) {
		//		console.log('ctrl-g detected');
		//	},
		//	readOnly: true
		//}]);

		css.setShowPrintMargin(false);
		css.setShowInvisibles(true);
		//css.setShowFoldWidgets(true);
		//css.session.setFoldStyle("markbegin");
		//var MultiSelect = require("ace/multi_select").MultiSelect;
		//new MultiSelect(css);


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

		var sendUpdate = function(e){
			var pubHTML = client.publish('/'+pageId+'/html', { html: html.getSession().getDocument().getValue() });
			var pubCSS = client.publish('/'+pageId+'/css', { css: css.getSession().getDocument().getValue() });
			var pubJS = client.publish('/'+pageId+'/js', { js: js.getSession().getDocument().getValue() });
			e.preventDefault();
		};

		$(document).on('body', 'keyup.Ctrl_s', sendUpdate);
		$("#run").click(sendUpdate);
		$("#save").click(function(e){
			var data = {
				docs: {
					html: {
						content: html.getSession().getDocument().getValue()
					},
					css: {
						content: css.getSession().getDocument().getValue()
					},
					js: {
						content: js.getSession().getDocument().getValue()
					}
				}
			};
			$.ajax({
				type: "POST",
				dataType: "json",
				data: data,
				url: "/"+pageId+"/save/",
				success: function(data){
					console.warn("Saved", data);
				},
				error: function(err){
					console.error("Save Error", err);
				}
			});
			history.pushState({}, "", "/"+pageId);
			e.preventDefault();
		});



		// Resize Editor/Preview proportions
		var
			starty = 0,
			starth = 0,
			startt = 0,
			resize = false,
			$cols = $('.editor-col'),
			$previewContainer = $('#preview-container'),
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
		$("#settings").click(function(e){
			$("#header-wrapper").toggleClass('showSettings');
			e.preventDefault();
		});


	});
})();