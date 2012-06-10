(function(){
	$(function(){

		// Ace
		var HTMLMode = require("ace/mode/html").Mode;
		var CSSMode = require("ace/mode/css").Mode;
		var JavaScriptMode = require("ace/mode/javascript").Mode;

		// Page Setup
		var
			pageId = zneak.page.pageId,
			editors = [];
		$.each(zneak.page.docs, function(i, doc){
			var editor = ace.edit(doc.type);
			editor.setTheme("ace/theme/twilight");
			switch(doc.type){
				case "html": editor.getSession().setMode(new HTMLMode()); break;
				case "css": editor.getSession().setMode(new CSSMode()); break;
				case "js": editor.getSession().setMode(new JavaScriptMode()); break;
			}
			editor.setShowPrintMargin(false);
			editor.setShowInvisibles(true);
			editor.getSession().getDocument().setValue(doc.content);
			editors[doc.type] = editor;
		});



		//html.commands.addCommands([{
		//	name: "gotoline",
		//	bindKey: {win: "Ctrl-G", mac: "Command-G"},
		//	exec: function(editor, line) {
		//		console.log('ctrl-g detected');
		//	},
		//	readOnly: true
		//}]);

		//css.setShowPrintMargin(false);
		//css.setShowInvisibles(true);
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
			var pubHTML = client.publish('/'+pageId+'/html', { html: editors['html'].getSession().getDocument().getValue() });
			var pubCSS = client.publish('/'+pageId+'/css', { css: editors['css'].getSession().getDocument().getValue() });
			var pubJS = client.publish('/'+pageId+'/js', { js: editors['js'].getSession().getDocument().getValue() });
			e.preventDefault();
		};

		$(document).on('body', 'keyup.Ctrl_s', sendUpdate);
		$("#run").click(sendUpdate);
		$("#save").click(function(e){
			var data = { docs: [] };
			$.each(zneak.page.docs, function(i, el){
				data.docs.push({
					type: el.type,
					docId: el.docId,
					content: editors[el.type].getSession().getDocument().getValue()
				});
			});
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