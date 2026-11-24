// public/js/lesson-editor-init.js

const LESSON_CONTENT_STYLE = `




html{
    background:#d6dce5;
    padding:40px 0;
}

body{
    width:8.27in;
    min-height:11.69in;

    margin:40px auto;

    padding-top:30px;
    padding-right:80px;
    padding-bottom:80px;
    padding-left:80px;

    background:#fff;

    border:1px solid #d1d5db;

    box-shadow:
       0 2px 5px rgba(0,0,0,.08),
       0 12px 40px rgba(0,0,0,.15);

    font-family:Calibri, Arial, sans-serif;
    font-size:12pt;
    line-height:1.6;
}

  h1 { color: #2c3e50; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; margin-top: 30px; }
  h2 { color: #34495e; margin-top: 30px; border-left: 4px solid #4CAF50; padding-left: 15px; }
  h3 { color: #555; margin-top: 25px; }

  .info-box-blue { background: #e3f2fd; border-left: 6px solid #2196F3; padding: 20px; margin: 25px 0; border-radius: 8px; }
  .info-box-blue h3 { color: #1976D2; margin-top: 0; }
  .btn-blue { display: inline-block; background: #2196F3; color: white !important; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }

  .tip-box-green { background: #e8f5e9; border-left: 6px solid #4CAF50; padding: 20px; margin: 25px 0; border-radius: 8px; }
  .tip-box-green h3 { color: #2E7D32; margin-top: 0; }

  .warning-box-yellow { background: #fff3e0; border-left: 6px solid #FF9800; padding: 20px; margin: 25px 0; border-radius: 8px; }
  .warning-box-yellow h3 { color: #E65100; margin-top: 0; }

  .important-box-red { background: #ffebee; border-left: 6px solid #f44336; padding: 20px; margin: 25px 0; border-radius: 8px; }
  .important-box-red h3 { color: #c62828; margin-top: 0; }

  .grammar-example { background: linear-gradient(135deg, #667eea 10%, #764ba2 100%); color: white; padding: 25px; margin: 25px 0; border-radius: 10px; }
  .grammar-example h3 { color: white; margin-top: 0; border-bottom: 2px solid white; display: inline-block; }
  .grammar-example strong { color: #FFD700; }
  .grammar-example .explanation { background: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px; margin-top: 15px; }

  pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-left: 4px solid #4CAF50; border-radius: 5px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #ddd; padding: 12px; }
  th { background: #4CAF50; color: white; }
`;

const QUICK_TEMPLATES = {
  blue: `<div class="info-box-blue"><h3>💡 Information</h3><p>Your information text goes here...</p></div><p><br></p>`,
  green: `<div class="tip-box-green"><h3>✅ Pro Tip</h3><p>Your helpful tip goes here...</p></div><p><br></p>`,
  yellow: `<div class="warning-box-yellow"><h3>⚠️ Warning</h3><p>Your warning message goes here...</p></div><p><br></p>`,
  red: `<div class="important-box-red"><h3>🔴 Important</h3><p>Your important information goes here...</p></div><p><br></p>`,
  example: `<div class="grammar-example"><h3>📖 Example</h3><p><strong>✅ Correct:</strong> Your correct example here.</p><p><strong>❌ Incorrect:</strong> Your incorrect example here.</p><div class="explanation">💡 Explanation: Why this is correct/incorrect.</div></div><p><br></p>`
};

function initLessonEditor(selector) {
  if (typeof tinymce === 'undefined') {
    console.warn('TinyMCE failed to load.');
    const ta = document.getElementById('discussion_content');
    if (ta) {
      ta.style.display = 'block';
      ta.style.height = '400px';
      ta.style.width = '100%';
    }
    return;
  }

   tinymce.init({
    selector: selector,
    height: 650,
    base_url: '/tinymce',
    suffix: '.min',
    license_key: 'gpl',
    menubar: 'file edit view insert format tools table help',

    toolbar:
'undo redo | ' +
'fontfamily fontsize blocks | ' +
'bold italic underline strikethrough | ' +
'forecolor backcolor | ' +
'alignleft aligncenter alignright alignjustify | ' +
'bullist numlist checklist | ' +
'outdent indent | ' +
'table image link media | ' +
'insertquiz | ' +
'removeformat code fullscreen',


font_family_formats:
'Calibri=Calibri,sans-serif;'+
'Arial=Arial,sans-serif;'+
'Times New Roman=times new roman,times;'+
'Georgia=Georgia,serif;'+
'Verdana=Verdana,sans-serif;'+
'Tahoma=Tahoma,sans-serif',
fontsize_formats:
'8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt',

    block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3',
    content_style: LESSON_CONTENT_STYLE,font_size_input_default: '12pt',
    forced_root_block: 'p',
    
    // ⬇️ THIS IS THE FIX ⬇️
    // Tell TinyMCE to keep div tags with our specific data attributes
        // Tell TinyMCE to keep divs with ANY data attribute
    extended_valid_elements: 'div[class|style|data-*],p[style|class],span[class|style]',


    
   setup: function (editor) {

    editor.on('init', () => {

        window.editorInstance = editor;

        editor.execCommand(
            'FontName',
            false,
            'Calibri'
        );

        console.log('TinyMCE loaded successfully');
    });

    editor.ui.registry.addButton('insertquiz', {
        text: '📝 Insert Quiz',
        tooltip: 'Add an interactive quiz to this lesson',
        onAction: function () {
            openQuizModal();
        }
    });
    }

    
  });
}

function insertColoredBox(type) {
  const editor = window.editorInstance || tinymce.activeEditor;
  if (!editor) {
    alert('Editor is still loading. Please wait a second and try again.');
    return;
  }
  
  const html = QUICK_TEMPLATES[type];
  if (html) {
    editor.insertContent(html);
    editor.focus();
  }
}