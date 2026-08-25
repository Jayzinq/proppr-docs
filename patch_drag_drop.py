import os

filepath = "/Users/zinq/PycharmProjects/Cerebro/proppr-docs/src/app/track/new-bet/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

# Add isDragging state
state_search = "const [bulkBets, setBulkBets] = useState<any[]>([]);"
state_replace = """const [bulkBets, setBulkBets] = useState<any[]>([]);
    const [isDragging, setIsDragging] = useState(false);"""
content = content.replace(state_search, state_replace)

# Modify the relative div to handle drag and drop
div_search = """<div className="relative">
                            <textarea 
                                className="w-full h-20 bg-white border border-gray-200 rounded-lg p-4 text-[14px] text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all resize-none shadow-sm"
                                placeholder="Paste text from Telegram, X, or your bookmaker to auto-fill this form..."
                                id="newBetParseTextarea"
                                value={parseText}
                                onChange={(e) => setParseText(e.target.value)}
                                onPaste={(e) => {"""

div_replace = """<div 
                            className={`relative border-2 border-dashed rounded-lg transition-all ${isDragging ? 'border-[#10b981] bg-[#10b981]/5' : 'border-transparent'}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const files = Array.from(e.dataTransfer.files);
                                const imageFiles = files.filter(file => file.type.startsWith('image/'));
                                if (imageFiles.length > 0) {
                                    if (parseImages.length + imageFiles.length > 5) {
                                        alert('Maximum of 5 images allowed');
                                        return;
                                    }
                                    imageFiles.forEach(file => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            const base64String = reader.result as string;
                                            setParseImages(prev => [...prev, base64String]);
                                        };
                                        reader.readAsDataURL(file);
                                    });
                                }
                            }}
                        >
                            <textarea 
                                className="w-full h-20 bg-white border border-gray-200 rounded-lg p-4 text-[14px] text-[#121212] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all resize-none shadow-sm"
                                placeholder="Paste or drag & drop images/text here to auto-fill this form..."
                                id="newBetParseTextarea"
                                value={parseText}
                                onChange={(e) => setParseText(e.target.value)}
                                onPaste={(e) => {"""

content = content.replace(div_search, div_replace)

with open(filepath, "w") as f:
    f.write(content)

print("Added drag and drop functionality")
