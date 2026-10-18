export function clusterLayout(slots:number[],width:number,height:number){
 const count=slots.length,gap=4+16/Math.sqrt(Math.max(1,count)),spacing=160+gap;
 const goldenAngle=Math.PI*(3-Math.sqrt(5));
 const points=slots.map((_,i)=>({x:Math.sqrt(i+.5)*Math.cos(i*goldenAngle),y:Math.sqrt(i+.5)*Math.sin(i*goldenAngle)}));
 let nearest=Infinity;
 for(let i=0;i<count;i++)for(let j=0;j<i;j++)nearest=Math.min(nearest,Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y));
 const unit=Number.isFinite(nearest)?spacing/nearest:1;
 for(const p of points){p.x*=unit;p.y*=unit;}
 if(points.length){const cx=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2,cy=(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2;for(const p of points){p.x-=cx;p.y-=cy;}}
 const extentX=Math.max(80,...points.map(p=>Math.abs(p.x)+80)),extentY=Math.max(80,...points.map(p=>Math.abs(p.y)+80));
 return {points,scale:Math.min(1,Math.max(1,width-32)/(2*extentX),Math.max(1,height-32)/(2*extentY)),gap};
}

