
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
            search:'',
            category:'',
            status:'',
            newItem:{name:'',category:'',description:''},
            ratingForm:{item_id:0,rating:0,comment:''}
        };
    },

    // This section prepares data for the page views.
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

        // This section lists only items borrowed by the logged-in user.
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

            if(page==='home') this.loadItems();

            if(['requests','borrowed','manage','ratings'].includes(page)){
                this.loadRequests();
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

                await Promise.all([this.loadItems(),this.loadRequests()]);
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

        // This section publishes a new community item.
        async addItem(){
            try{
                const data=await this.api('/items',{
                    method:'POST',
                    body:JSON.stringify({
                        user_id:this.user.id,
                        name:this.newItem.name,
                        category:this.newItem.category,
                        description:this.newItem.description
                    })
                });

                this.newItem={name:'',category:'',description:''};
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
                await Promise.all([this.loadItems(),this.loadRequests()]);
            }catch(err){
                this.message=err.message;
            }
        },

        // This section loads borrow requests.
        async loadRequests(){
            if(!this.user) return;

            try{
                const data=await this.api('/requests');
                this.allRequests=Array.isArray(data)?data:[];
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
                await Promise.all([this.loadRequests(),this.loadItems()]);
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
                await Promise.all([this.loadRequests(),this.loadItems()]);
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

        // This section submits a rating for the selected item's owner.
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

                this.message=data.message||'Rating submitted successfully!';
                this.ratingForm={item_id:0,rating:0,comment:''};
                await this.loadRatings();
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
        }
    },

    // This section loads existing records when the app opens.
    async mounted(){
        if(this.user){
            await Promise.all([this.loadItems(),this.loadRequests()]);
        }
    }
});

// This section starts the Vue application.
app.mount('#app');
