"""Create visual comparison sheets in memory for image review (no file changes)."""
from PIL import Image, ImageOps, ImageDraw, ImageFont
from pathlib import Path
from io import BytesIO
import base64

font_path="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
font=ImageFont.truetype(font_path,18) if Path(font_path).exists() else ImageFont.load_default()

def draw_sheet(name, pairs):
    width=1040; cellw=500; cellh=335; gap=20; top=46; rowh=390
    canvas=Image.new("RGB",(width,top+len(pairs)*rowh),"#f0eee9")
    painter=ImageDraw.Draw(canvas)
    painter.text((20,12),name,fill="#222",font=font)
    for r,(left,right,label) in enumerate(pairs):
        y=top+r*rowh
        for c,file in enumerate([left,right]):
            x=20+c*(cellw+gap)
            path=Path(file)
            if not path.exists():
                painter.text((x+10,y+30),"MISSING "+file,fill="#a00",font=font)
                continue
            with Image.open(path) as opened:
                photo=ImageOps.exif_transpose(opened).convert("RGB")
                fitted=ImageOps.contain(photo,(cellw,cellh),Image.Resampling.LANCZOS)
                canvas.paste(fitted,(x+(cellw-fitted.width)//2,y+(cellh-fitted.height)//2))
                painter.text((x+4,y+cellh+6),("ORIGINAL" if c==0 else "EDITED")+" / "+
                             f"{photo.width}x{photo.height}  {label}",fill="#333",font=font)
    buffer=BytesIO()
    canvas.save(buffer,format="JPEG",quality=67,optimize=True,subsampling=0)
    print("PHOTO_CONTACT_SHEET_"+name.replace(" ","_")+"="+base64.b64encode(buffer.getvalue()).decode("ascii"))

draw_sheet("BRODIE",[
    ("assets/deacon-brodie-house-cafe.webp","assets/deacon-brodie-house-cafe-edited.png","cafe"),
    ("assets/deacon-brodie-tavern.webp","assets/deacon-brodie-tavern-edited.png","tavern"),
    ("assets/deacon-brodie-cabinet.webp","assets/deacon-brodie-cabinet-edited.png","cabinet")
])
draw_sheet("CITY",[
    ("assets/city-chambers-front.jpg","assets/city-chambers-front-18362.png","front"),
    ("assets/city-chambers-courtyard.jpg","assets/city-chambers-courtyard-18363.png","courtyard"),
    ("assets/new-college/new-college-exterior.png","assets/new-college/new-college-view.png","new college")
])
