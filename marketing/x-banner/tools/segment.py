import cv2, numpy as np, json, sys
import os; S=os.path.dirname(os.path.abspath(__file__))
img=cv2.imread(os.path.join(S,'..','..','..','public','looks','look6.jpg')); H,W=img.shape[:2]
polys=json.load(open(S+'/seed-polygons.json'))
def to_px(s): return np.array([[float(a)*W,float(b)*H] for a,b in (p.split(',') for p in s.split())],np.int32)
out={}
hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
skin=cv2.inRange(hsv,(0,35,90),(22,170,255))
skin=cv2.morphologyEx(skin,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
for name,shrink,grow in [('shirt',6,10),('jeans',7,5),('bag',3,6)]:
    poly=to_px(polys[name])
    mask=np.full((H,W),cv2.GC_BGD,np.uint8)
    base=np.zeros((H,W),np.uint8); cv2.fillPoly(base,[poly],255)
    k=lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
    sure=cv2.erode(base,k(shrink)); prob=cv2.dilate(base,k(grow))
    mask[prob>0]=cv2.GC_PR_BGD; mask[base>0]=cv2.GC_PR_FGD; mask[sure>0]=cv2.GC_FGD
    if name!='bag': mask[skin>0]=cv2.GC_BGD
    bgd=np.zeros((1,65),np.float64); fgd=np.zeros((1,65),np.float64)
    cv2.grabCut(img,mask,None,bgd,fgd,6,cv2.GC_INIT_WITH_MASK)
    m=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,k(2)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,k(3))
    cnts,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cnts=sorted(cnts,key=cv2.contourArea,reverse=True)
    rings=[]
    for c in cnts[:2]:
        if cv2.contourArea(c)<0.02*cv2.contourArea(cnts[0]): continue
        ap=cv2.approxPolyDP(c,1.6,True).reshape(-1,2)
        rings.append(' '.join(f'{x/W:.4f},{y/H:.4f}' for x,y in ap))
    out[name]=rings
    print(name,'rings',len(rings),'pts',[len(r.split()) for r in rings])
    pass
json.dump(out,open(S+'/segmented-polygons.json','w'))
# preview overlay
