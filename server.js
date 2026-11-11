require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DB_FILE = path.join(__dirname, "data.json");
const seed = {
  products: [
    {id:1,name:"Fresh Tomatoes",category:"Vegetables",unit:"1 kg",price:35,oldPrice:45,emoji:"🍅",stock:50,description:"Fresh farm tomatoes"},
    {id:2,name:"Potatoes",category:"Vegetables",unit:"1 kg",price:30,oldPrice:35,emoji:"🥔",stock:60,description:"Everyday cooking essential"},
    {id:3,name:"Bananas",category:"Fruits",unit:"6 pcs",price:40,oldPrice:50,emoji:"🍌",stock:40,description:"Naturally sweet bananas"},
    {id:4,name:"Apples",category:"Fruits",unit:"1 kg",price:140,oldPrice:160,emoji:"🍎",stock:25,description:"Crisp and juicy apples"},
    {id:5,name:"Milk",category:"Dairy",unit:"1 litre",price:58,oldPrice:62,emoji:"🥛",stock:80,description:"Fresh toned milk"},
    {id:6,name:"Bread",category:"Dairy",unit:"1 pack",price:40,oldPrice:45,emoji:"🍞",stock:35,description:"Soft sandwich bread"},
    {id:7,name:"Rice",category:"Staples",unit:"5 kg",price:320,oldPrice:360,emoji:"🍚",stock:30,description:"Daily-use rice"},
    {id:8,name:"Atta",category:"Staples",unit:"5 kg",price:245,oldPrice:270,emoji:"🌾",stock:30,description:"Whole wheat flour"},
    {id:9,name:"Potato Chips",category:"Snacks",unit:"1 pack",price:20,oldPrice:20,emoji:"🍟",stock:100,description:"Crunchy salted snack"},
    {id:10,name:"Dishwash Liquid",category:"Household",unit:"500 ml",price:99,oldPrice:120,emoji:"🧴",stock:20,description:"Everyday kitchen cleaning"}
  ],
  orders: []
};
function loadDB(){ try { return JSON.parse(fs.readFileSync(DB_FILE,"utf8")); } catch { fs.writeFileSync(DB_FILE,JSON.stringify(seed,null,2)); return structuredClone(seed); } }
let db = loadDB();
function saveDB(){ fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2)); }
function admin(req,res,next){
  const token = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) return res.status(401).json({error:"Admin login required"});
  next();
}
app.get("/api/products",(req,res)=>{
  const q=(req.query.q||"").toLowerCase(), cat=req.query.category||"All";
  res.json(db.products.filter(p=>(cat==="All"||p.category===cat)&&(!q||p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q))));
});
app.get("/api/categories",(req,res)=>res.json(["All",...new Set(db.products.map(p=>p.category))]));
app.post("/api/orders",(req,res)=>{
  const {customer,phone,address,location,paymentMethod,items}=req.body||{};
  if(!customer||!phone||!address||!Array.isArray(items)||!items.length) return res.status(400).json({error:"Please provide name, phone, address and cart items."});
  let total=0, orderItems=[];
  for(const item of items){
    const p=db.products.find(x=>x.id===Number(item.id));
    const qty=Math.max(1,Math.min(99,Number(item.qty)||1));
    if(!p||p.stock<qty) return res.status(400).json({error:`Insufficient stock for ${p?.name||"a product"}`});
    total+=p.price*qty; orderItems.push({id:p.id,name:p.name,price:p.price,qty,emoji:p.emoji});
  }
  const delivery=total>=499?0:25;
  const order={id:"TJD"+Date.now(),customer,phone,address,location:location||null,paymentMethod:paymentMethod||"COD",items:orderItems,subtotal:total,delivery,total:total+delivery,status:"Order Placed",paymentStatus:paymentMethod==="COD"?"Pay on delivery":"Pending",createdAt:new Date().toISOString()};
  db.orders.unshift(order); saveDB(); res.status(201).json(order);
});
app.get("/api/orders/:id",(req,res)=>{
  const o=db.orders.find(x=>x.id===req.params.id); if(!o) return res.status(404).json({error:"Order not found"}); res.json(o);
});
app.post("/api/payments/create-order",async(req,res)=>{
  const {amount}=req.body||{};
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({error:"Online payments are not configured. Add Razorpay test keys in .env. COD is available."});
  try{
    const rz=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
    const order=await rz.orders.create({amount:Math.round(Number(amount)*100),currency:"INR",receipt:"tjd_"+Date.now()});
    res.json({id:order.id,amount:order.amount,currency:order.currency,key:process.env.RAZORPAY_KEY_ID});
  }catch(e){res.status(500).json({error:"Could not create payment order"});}
});
app.post("/api/payments/verify",(req,res)=>{
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body||{};
  if(!process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({error:"Payment keys are not configured"});
  const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id+"|"+razorpay_payment_id).digest("hex");
  if(expected!==razorpay_signature) return res.status(400).json({verified:false,error:"Payment signature verification failed"});
  res.json({verified:true});
});
app.get("/api/admin/orders",admin,(req,res)=>res.json(db.orders));
app.patch("/api/admin/orders/:id",admin,(req,res)=>{
  const o=db.orders.find(x=>x.id===req.params.id); if(!o)return res.status(404).json({error:"Order not found"});
  const allowed=["Order Confirmed","Preparing Your Order","Packed","Out for Delivery","Delivered","Cancelled"];
  if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid status"});
  o.status=req.body.status; saveDB(); res.json(o);
});
app.post("/api/admin/products",admin,(req,res)=>{
  const {name,category,unit,price,stock,emoji,description}=req.body||{};
  if(!name||!category||!unit||Number(price)<0)return res.status(400).json({error:"Name, category, unit and valid price required"});
  const p={id:Date.now(),name,category,unit,price:Number(price),oldPrice:Number(price),stock:Number(stock)||0,emoji:emoji||"🛒",description:description||""};
  db.products.push(p);saveDB();res.status(201).json(p);
});
app.delete("/api/admin/products/:id",admin,(req,res)=>{
  db.products=db.products.filter(p=>p.id!==Number(req.params.id));saveDB();res.json({ok:true});
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Tiwari Ji Daily Needs running at http://localhost:${port}`));
