
const API='./api';

// This section initializes the Vue application.
const app=Vue.createApp({
    data(){
        return {
            user:JSON.parse(localStorage.getItem('circloUser')||'null'),
            authMode:'login',
            auth:{name:'',email:'',password:''},
            message:'',
            loading:false,
            currentPage:'home',
            items:[],
            allRequests:[],
            allRatings:[],
            notifications:[],
            search:'',
            category:'',
            status:'',
            newItem:{name:'',category:'',description:''},
            ratingForm:{item_id:0,rating:0,comment:''},
            highlightedRatingId:null,
            selectedImageFile:null,
            imagePreviewUrl:null,
            imageError:'',
            mobileMenuOpen:false
        };
    },

    // This section prepares computed data for the page views.
    computed:{
        filteredItems(){
            return this.items;
        },

        requests(){
            return this.allRequests.filter(
                r=>Number(r.borrower_id)===Number(this.user?.id)
            );
        },

        ownerRequests(){
            return this.allRequests.filter(
                r=>Number(r.owner_id)===Number(this.user?.id)
            );
        },

        borrowedItems(){
            return this.requests.filter(r=>r.status==='Approved');
        },

        // This section lists only items borrowed and returned by the logged-in user.
        rateableItems(){
            const uniqueItems=new Map();

            this.requests
                .filter(r=>['Approved','Returned'].includes(r.status))
                .forEach(r=>{
                    if(!uniqueItems.has(Number(r.item_id))){
                        uniqueItems.set(Number(r.item_id),r);
                    }
                });

            return [...uniqueItems.values()];
        },

        unreadNotifications(){
            return this.notifications.filter(n=>!n.is_read);
        }
    },

    methods:{
        // This section communicates with the backend API.
        async api(path,options={}){
            const response=await fetch(API+path,{
                ...options,
                headers:{
                    'Content-Type':'application/json',
                    ...(options.headers||{})
                }
            });

            const data=await response.json().catch(()=>({}));

            if(!response.ok){
                throw new Error(data.message);
            }

            return data;
        },

        // This section switches between application pages.
        goTo(page){
            this.currentPage=page;
            this.message='';
            this.mobileMenuOpen=false;

            if(page==='home') this.loadItems();

            if(['requests','borrowed','manage','ratings'].includes(page)){
                this.loadRequests();
                this.loadNotifications();
            }

            if(page==='ratings') this.loadRatings();
        },

        // This section registers a new user.
        async register(){
            try{
                const data=await this.api('/users/register',{
                    method:'POST',
                    body:JSON.stringify(this.auth)
                });

                this.message=data.message||'Account created successfully!';
                this.authMode='login';
                this.auth.password='';
            }catch(err){
                this.message=err.message;
            }
        },

        // This section logs in an existing user.
        async login(){
            try{
                const data=await this.api('/users/login',{
                    method:'POST',
                    body:JSON.stringify({
                        email:this.auth.email,
                        password:this.auth.password
                    })
                });

                const loggedUser=data.user||data;

                if(!loggedUser.id){
                    throw new Error('Login response did not contain a user ID');
                }

                this.user=loggedUser;
                localStorage.setItem('circloUser',JSON.stringify(loggedUser));
                this.currentPage='home';
                this.auth.password='';
                this.message='Welcome to Circlo!';

                await Promise.all([
                    this.loadItems(),
                    this.loadRequests(),
                    this.loadNotifications()
                ]);
            }catch(err){
                this.message=err.message;
            }
        },

        // This section logs out without deleting database records.
        logout(){
            localStorage.removeItem('circloUser');
            this.user=null;
            this.currentPage='home';
            this.items=[];
            this.allRequests=[];
            this.allRatings=[];
            this.notifications=[];
            this.highlightedRatingId=null;
            this.clearSelectedImage();
            this.mobileMenuOpen=false;
            this.message='';
        },

        // This section loads and filters shared items.
        async loadItems(){
            if(!this.user) return;

            try{
                this.loading=true;

                const params=new URLSearchParams();
                if(this.search) params.set('search',this.search);
                if(this.category) params.set('category',this.category);
                if(this.status) params.set('status',this.status);

                const query=params.toString();
                const data=await this.api('/items'+(query?'?'+query:''));

                this.items=Array.isArray(data)?data:[];
            }catch(err){
                this.message=err.message;
            }finally{
                this.loading=false;
            }
        },

        // This section handles image file selection from user's laptop.
        handleImageSelect(event){
            this.imageError='';
            const file=event.target.files?.[0];
            if(!file) return;

            const allowedTypes=['image/jpeg','image/jpg','image/png','image/webp'];
            if(!allowedTypes.includes(file.type.toLowerCase())){
                this.imageError='Invalid file type. Only JPG, JPEG, PNG, and WebP are allowed.';
                this.clearSelectedImage();
                return;
            }

            const maxSize=5*1024*1024; // 5 MB
            if(file.size>maxSize){
                this.imageError='File is too large. Maximum allowed size is 5 MB.';
                this.clearSelectedImage();
                return;
            }

            this.selectedImageFile=file;
            this.imagePreviewUrl=URL.createObjectURL(file);
        },

        // This section removes or resets selected image preview.
        clearSelectedImage(){
            if(this.imagePreviewUrl&&this.imagePreviewUrl.startsWith('blob:')){
                URL.revokeObjectURL(this.imagePreviewUrl);
            }
            this.selectedImageFile=null;
            this.imagePreviewUrl=null;
            if(this.$refs.fileInput){
                this.$refs.fileInput.value='';
            }
        },

        // This section publishes a new community item, optionally with an uploaded image.
        async addItem(){
            try{
                this.imageError='';

                let data;
                if(this.selectedImageFile){
                    const formData=new FormData();
                    formData.append('user_id',this.user.id);
                    formData.append('name',this.newItem.name);
                    formData.append('category',this.newItem.category);
                    formData.append('description',this.newItem.description||'');
                    formData.append('image',this.selectedImageFile);

                    const response=await fetch(API+'/items',{
                        method:'POST',
                        body:formData
                    });

                    data=await response.json().catch(()=>({}));
                    if(!response.ok){
                        throw new Error(data.message||'Could not publish item');
                    }
                }else{
                    data=await this.api('/items',{
                        method:'POST',
                        body:JSON.stringify({
                            user_id:this.user.id,
                            name:this.newItem.name,
                            category:this.newItem.category,
                            description:this.newItem.description
                        })
                    });
                }

                this.newItem={name:'',category:'',description:''};
                this.clearSelectedImage();
                this.message=data.message||'Item shared successfully!';
                await this.loadItems();
                this.currentPage='home';
            }catch(err){
                this.message=err.message;
            }
        },

        // This section requests to borrow an available item.
        async borrowItem(itemId){
            try{
                const data=await this.api('/requests',{
                    method:'POST',
                    body:JSON.stringify({
                        item_id:itemId,
                        borrower_id:this.user.id
                    })
                });

                this.message=data.message||'Borrow request sent!';
                await Promise.all([
                    this.loadItems(),
                    this.loadRequests(),
                    this.loadNotifications()
                ]);
            }catch(err){
                this.message=err.message;
            }
        },

        // This section loads borrow requests and synchronizes overdue notifications.
        async loadRequests(){
            if(!this.user) return;

            try{
                const data=await this.api('/requests');
                this.allRequests=Array.isArray(data)?data:[];
                this.loadNotifications();
            }catch(err){
                this.message=err.message;
            }
        },

        // This section allows owners to approve or reject requests.
        async updateRequest(requestId,status){
            try{
                const data=await this.api('/requests/'+requestId,{
                    method:'PUT',
                    body:JSON.stringify({status})
                });

                this.message=data.message||'Request updated successfully!';
                await Promise.all([
                    this.loadRequests(),
                    this.loadItems(),
                    this.loadNotifications()
                ]);
            }catch(err){
                this.message=err.message;
            }
        },

        // This section returns a borrowed item.
        async returnItem(requestId){
            try{
                const data=await this.api('/requests/'+requestId+'/return',{
                    method:'PUT'
                });

                this.message=data.message||'Item returned successfully!';
                await Promise.all([
                    this.loadRequests(),
                    this.loadItems(),
                    this.loadNotifications()
                ]);
                this.currentPage='requests';
            }catch(err){
                this.message=err.message;
            }
        },

        // This section opens the form for a returned borrowed item.
        startRating(itemId){
            const item=this.rateableItems.find(
                r=>Number(r.item_id)===Number(itemId)
            );

            if(!item){
                this.message='Only returned borrowed items can be rated.';
                return;
            }

            this.ratingForm={
                item_id:Number(item.item_id),
                rating:0,
                comment:''
            };

            this.currentPage='ratings';
            this.message='Rate your experience with '+item.item_name+'.';
            this.loadRatings();
        },

        // This section submits a rating for the selected item's owner and triggers highlight.
        async submitRating(){
            try{
                const item=this.rateableItems.find(
                    r=>Number(r.item_id)===Number(this.ratingForm.item_id)
                );

                if(!item){
                    this.message='Please select a returned borrowed item.';
                    return;
                }

                if(!this.ratingForm.rating){
                    this.message='Please select a rating.';
                    return;
                }

                const data=await this.api('/ratings',{
                    method:'POST',
                    body:JSON.stringify({
                        reviewer_id:this.user.id,
                        user_id:item.owner_id,
                        item_id:item.item_id,
                        rating:this.ratingForm.rating,
                        comment:this.ratingForm.comment
                    })
                });

                const newRatingId=data.id||data.ratingId;
                this.message=data.message||'Rating submitted successfully!';
                this.ratingForm={item_id:0,rating:0,comment:''};

                await this.loadRatings();

                if(newRatingId){
                    this.highlightedRatingId=Number(newRatingId);
                }else if(this.allRatings.length>0){
                    this.highlightedRatingId=Number(this.allRatings[0].id);
                }
            }catch(err){
                this.message=err.message;
            }
        },

        // This section loads saved community reviews.
        async loadRatings(){
            if(!this.user) return;

            try{
                const data=await this.api('/ratings');
                this.allRatings=Array.isArray(data)?data:[];
            }catch(err){
                this.message=err.message;
            }
        },

        // This section loads in-app overdue notifications.
        async loadNotifications(){
            if(!this.user) return;

            try{
                const data=await this.api('/notifications?user_id='+this.user.id);
                this.notifications=Array.isArray(data)?data:[];
            }catch(err){
                console.warn('Could not load notifications:',err.message);
            }
        },

        // This section marks an individual notification as read.
        async markNotificationRead(id){
            try{
                await this.api('/notifications/'+id+'/read',{method:'PUT'});
                const notif=this.notifications.find(n=>n.id===id);
                if(notif) notif.is_read=1;
            }catch(err){
                console.error(err);
            }
        },

        // This section marks all notifications as read.
        async markAllNotificationsRead(){
            try{
                await this.api('/notifications/read-all',{
                    method:'PUT',
                    body:JSON.stringify({user_id:this.user.id})
                });
                this.notifications.forEach(n=>n.is_read=1);
            }catch(err){
                console.error(err);
            }
        },

        // This section returns an appropriate icon based on item category.
        getCategoryIcon(category){
            const cat=(category||'').toLowerCase();
            if(cat.includes('book')) return '📚';
            if(cat.includes('electr')) return '💻';
            if(cat.includes('sport')) return '⚽';
            if(cat.includes('home')) return '🏡';
            return '📦';
        },

        // This section formats date strings clearly.
        formatDate(dateString){
            if(!dateString) return 'N/A';
            const date=new Date(dateString);
            if(isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString(undefined,{
                month:'short',
                day:'numeric',
                year:'numeric'
            });
        },

        formatDateTime(dateString){
            if(!dateString) return 'N/A';
            const date=new Date(dateString);
            if(isNaN(date.getTime())) return dateString;
            return date.toLocaleString(undefined,{
                month:'short',
                day:'numeric',
                year:'numeric',
                hour:'numeric',
                minute:'2-digit'
            });
        },

        // This section calculates remaining time or overdue duration for borrowing.
        getRemainingTime(dueAt){
            if(!dueAt) return {text:'No deadline set',isOverdue:false};
            const now=new Date();
            const due=new Date(dueAt);
            const diffMs=due-now;

            if(diffMs<0){
                const overdueMs=Math.abs(diffMs);
                const days=Math.floor(overdueMs/(1000*60*60*24));
                const hours=Math.floor((overdueMs%(1000*60*60*24))/(1000*60*60));

                let text='Overdue by ';
                if(days>0){
                    text+=`${days} day${days>1?'s':''}`;
                    if(hours>0) text+=` and ${hours} hr${hours>1?'s':''}`;
                }else{
                    text+=`${Math.max(1,hours)} hr${hours>1?'s':''}`;
                }
                return {text,isOverdue:true};
            }else{
                const days=Math.floor(diffMs/(1000*60*60*24));
                const hours=Math.floor((diffMs%(1000*60*60*24))/(1000*60*60));

                let text='';
                if(days>0){
                    text=`${days} day${days>1?'s':''} left`;
                }else if(hours>0){
                    text=`${hours} hour${hours>1?'s':''} left`;
                }else{
                    text='Due in less than an hour';
                }
                return {text,isOverdue:false};
            }
        },

        // Navigation and mobile menu handlers
        toggleMobileMenu(){
            this.mobileMenuOpen=!this.mobileMenuOpen;
        },

        closeMobileMenu(){
            this.mobileMenuOpen=false;
        },

        mobileNav(page){
            this.goTo(page);
            this.mobileMenuOpen=false;
        },

        mobileLogout(){
            this.logout();
            this.mobileMenuOpen=false;
        },

        mobileAuth(mode){
            this.authMode=mode;
            this.mobileMenuOpen=false;
            const el=document.getElementById('auth');
            if(el) el.scrollIntoView({behavior:'smooth'});
        },

        handleWindowClick(e){
            if(this.mobileMenuOpen){
                const wrapper=this.$refs.mobileNavWrapper;
                if(wrapper&&!wrapper.contains(e.target)){
                    this.mobileMenuOpen=false;
                }
            }
        },

        handleKeyDown(e){
            if(e.key==='Escape'&&this.mobileMenuOpen){
                this.mobileMenuOpen=false;
            }
        }
    },

    // This section loads existing records and initializes listeners when the app opens.
    async mounted(){
        window.addEventListener('click',this.handleWindowClick);
        window.addEventListener('keydown',this.handleKeyDown);

        if(this.user){
            await Promise.all([
                this.loadItems(),
                this.loadRequests(),
                this.loadNotifications()
            ]);
        }
    },

    unmounted(){
        window.removeEventListener('click',this.handleWindowClick);
        window.removeEventListener('keydown',this.handleKeyDown);
        this.clearSelectedImage();
    }
});

/**
 * Feature 1: Custom Vue 3 directive v-rating-highlight.
 * Visual highlight for newly submitted ratings using lifecycle hooks.
 */
function applyRatingHighlightEffect(el){
    if(!el._origBg) el._origBg=el.style.backgroundColor||'';
    if(!el._origBorder) el._origBorder=el.style.borderColor||'';
    if(!el._origShadow) el._origShadow=el.style.boxShadow||'';
    if(!el._origTransform) el._origTransform=el.style.transform||'';

    el.style.transition='all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.backgroundColor='#eaf8ef';
    el.style.borderColor='#16794b';
    el.style.boxShadow='0 6px 20px rgba(22, 121, 75, 0.22)';
    el.style.transform='translateY(-2px)';

    try{
        el.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(e){}

    if(el._ratingHighlightTimeout){
        clearTimeout(el._ratingHighlightTimeout);
    }
    el._ratingHighlightTimeout=setTimeout(()=>{
        clearRatingHighlightEffect(el);
    },5000);
}

function clearRatingHighlightEffect(el){
    el.style.backgroundColor=el._origBg||'';
    el.style.borderColor=el._origBorder||'';
    el.style.boxShadow=el._origShadow||'';
    el.style.transform=el._origTransform||'';
}

app.directive('rating-highlight',{
    mounted(el,binding){
        if(binding.value){
            applyRatingHighlightEffect(el);
        }
    },
    updated(el,binding){
        if(binding.value&&!binding.oldValue){
            applyRatingHighlightEffect(el);
        }else if(!binding.value&&binding.oldValue){
            clearRatingHighlightEffect(el);
        }
    },
    unmounted(el){
        if(el._ratingHighlightTimeout){
            clearTimeout(el._ratingHighlightTimeout);
        }
    }
});

// This section starts the Vue application.
app.mount('#app');
