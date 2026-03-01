// Movie Database Application
class MovieDatabase {
    constructor() {
        // ✅ YOUR API KEY - WORKING!
        this.API_KEY = 'e484a149cd2d4d29052a72752de2f16b';
        this.BASE_URL = 'https://api.themoviedb.org/3';
        this.IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
        
        // State
        this.currentTab = 'trending';
        this.movies = [];
        this.watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        this.reviews = JSON.parse(localStorage.getItem('movieReviews')) || {};
        this.currentMovie = null;
        this.selectedRating = 0;
        
        // DOM Elements
        this.initElements();
        this.initEventListeners();
        this.loadTab('trending');
    }

    initElements() {
        this.mainContent = document.getElementById('mainContent');
        this.searchSection = document.getElementById('searchSection');
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.autocompleteBox = document.getElementById('autocompleteResults');
        this.movieModal = document.getElementById('movieModal');
        this.ratingModal = document.getElementById('ratingModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalBody = document.getElementById('modalBody');
        this.addToWatchlistBtn = document.getElementById('addToWatchlistBtn');
        this.rateMovieBtn = document.getElementById('rateMovieBtn');
        this.submitRating = document.getElementById('submitRating');
        
        // Nav tabs
        this.navTabs = document.querySelectorAll('.nav-tabs li');
        
        // Close modal buttons
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
        
        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    initEventListeners() {
        // Navigation tabs
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Search with debounce
        this.searchInput.addEventListener('input', this.debounce(() => {
            const query = this.searchInput.value.trim();
            if (query.length > 2) {
                this.autocompleteSearch(query);
            } else {
                this.autocompleteBox.style.display = 'none';
            }
        }, 300));
        
        // Search button
        this.searchBtn.addEventListener('click', () => {
            const query = this.searchInput.value.trim();
            if (query) {
                this.searchMovies(query);
            }
        });
        
        // Enter key in search
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = this.searchInput.value.trim();
                if (query) {
                    this.searchMovies(query);
                }
            }
        });
        
        // Watchlist button in modal
        this.addToWatchlistBtn.addEventListener('click', () => {
            this.toggleWatchlist();
        });
        
        // Rate button
        this.rateMovieBtn.addEventListener('click', () => {
            this.openRatingModal();
        });
        
        // Submit rating
        this.submitRating.addEventListener('click', () => {
            this.submitUserRating();
        });
        
        // Rating stars
        document.querySelectorAll('.rating-stars i').forEach(star => {
            star.addEventListener('mouseenter', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.highlightStars(rating);
            });
            
            star.addEventListener('mouseleave', () => {
                this.resetStars();
            });
            
            star.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.selectedRating = rating;
                this.highlightStars(rating, true);
            });
        });
    }

    // Utility Functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Tab Management
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update active tab
        this.navTabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show/hide search section
        this.searchSection.style.display = tabName === 'search' ? 'block' : 'none';
        
        // Load tab content
        this.loadTab(tabName);
    }

    loadTab(tabName) {
        switch(tabName) {
            case 'trending':
                this.fetchTrending();
                break;
            case 'search':
                this.mainContent.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>Search for movies</h3><p>Type a movie title to begin</p></div>';
                break;
            case 'watchlist':
                this.displayWatchlist();
                break;
            case 'genres':
                this.fetchGenres();
                break;
        }
    }

    // API Calls
    async fetchTrending() {
        this.showLoading();
        
        try {
            const response = await fetch(
                `${this.BASE_URL}/trending/movie/week?api_key=${this.API_KEY}`
            );
            const data = await response.json();
            this.movies = data.results;
            this.displayMovies(this.movies);
        } catch (error) {
            console.error('Error fetching trending:', error);
            this.showError('Failed to load trending movies. Please check your API key.');
        }
    }

    async searchMovies(query) {
        this.showLoading();
        
        try {
            const response = await fetch(
                `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(query)}`
            );
            const data = await response.json();
            this.movies = data.results;
            this.displayMovies(this.movies);
            this.autocompleteBox.style.display = 'none';
        } catch (error) {
            console.error('Error searching:', error);
            this.showError('Search failed');
        }
    }

    async autocompleteSearch(query) {
        try {
            const response = await fetch(
                `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(query)}&page=1`
            );
            const data = await response.json();
            this.showAutocomplete(data.results.slice(0, 5));
        } catch (error) {
            console.error('Autocomplete error:', error);
        }
    }

    async fetchMovieDetails(movieId) {
        try {
            const [movieRes, creditsRes, videosRes] = await Promise.all([
                fetch(`${this.BASE_URL}/movie/${movieId}?api_key=${this.API_KEY}`),
                fetch(`${this.BASE_URL}/movie/${movieId}/credits?api_key=${this.API_KEY}`),
                fetch(`${this.BASE_URL}/movie/${movieId}/videos?api_key=${this.API_KEY}`)
            ]);
            
            const movie = await movieRes.json();
            const credits = await creditsRes.json();
            const videos = await videosRes.json();
            
            this.currentMovie = { ...movie, credits, videos };
            this.showMovieDetails(this.currentMovie);
        } catch (error) {
            console.error('Failed to load movie details:', error);
        }
    }

    async fetchGenres() {
        this.showLoading();
        
        try {
            const response = await fetch(
                `${this.BASE_URL}/genre/movie/list?api_key=${this.API_KEY}`
            );
            const data = await response.json();
            this.displayGenres(data.genres);
        } catch (error) {
            console.error('Error fetching genres:', error);
            this.showError('Failed to load genres');
        }
    }

    async fetchMoviesByGenre(genreId, genreName) {
        this.showLoading();
        
        try {
            const response = await fetch(
                `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`
            );
            const data = await response.json();
            this.movies = data.results;
            this.displayMovies(this.movies, `${genreName} Movies`);
        } catch (error) {
            console.error('Error fetching by genre:', error);
            this.showError('Failed to load genre movies');
        }
    }

    // Display Functions
    displayMovies(movies, title = '') {
        if (!movies || movies.length === 0) {
            this.mainContent.innerHTML = '<div class="empty-state"><i class="fas fa-film"></i><h3>No movies found</h3></div>';
            return;
        }

        const titleHtml = title ? `<h2 style="margin-bottom: 20px;">${title}</h2>` : '';
        
        const moviesHtml = movies.map(movie => {
            const poster = movie.poster_path 
                ? `${this.IMAGE_BASE}${movie.poster_path}`
                : 'https://via.placeholder.com/500x750?text=No+Poster';
            
            const ratingClass = this.getRatingClass(movie.vote_average);
            const inWatchlist = this.watchlist.includes(movie.id);
            const watchlistBadge = inWatchlist ? '<div class="watchlist-badge"><i class="fas fa-bookmark"></i> Watchlist</div>' : '';
            
            return `
                <div class="movie-card" data-id="${movie.id}">
                    <div class="movie-poster">
                        <img src="${poster}" alt="${movie.title}" loading="lazy">
                        <div class="movie-rating ${ratingClass}">${movie.vote_average.toFixed(1)}</div>
                        ${watchlistBadge}
                    </div>
                    <div class="movie-info">
                        <div class="movie-title">${movie.title}</div>
                        <div class="movie-meta">
                            <span>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.mainContent.innerHTML = titleHtml + '<div class="movies-grid">' + moviesHtml + '</div>';
        
        // Add click listeners
        document.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.id;
                this.fetchMovieDetails(movieId);
                this.movieModal.style.display = 'block';
            });
        });
    }

    displayWatchlist() {
        if (this.watchlist.length === 0) {
            this.mainContent.innerHTML = '<div class="empty-state"><i class="fas fa-bookmark"></i><h3>Your watchlist is empty</h3><p>Add movies from the Trending or Search tabs</p></div>';
            return;
        }

        this.showLoading();
        
        // Fetch all watchlist movies
        Promise.all(this.watchlist.map(id => 
            fetch(`${this.BASE_URL}/movie/${id}?api_key=${this.API_KEY}`).then(res => res.json())
        )).then(movies => {
            this.displayMovies(movies, 'My Watchlist');
        }).catch(() => {
            this.showError('Failed to load watchlist');
        });
    }

    displayGenres(genres) {
        const genresHtml = `
            <h2 style="margin-bottom: 20px;">Browse by Genre</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                ${genres.map(genre => `
                    <div class="genre-card" data-id="${genre.id}" data-name="${genre.name}" style="background: #01b4e4; color: white; padding: 30px; text-align: center; border-radius: 10px; cursor: pointer; transition: transform 0.3s;">
                        <h3>${genre.name}</h3>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.mainContent.innerHTML = genresHtml;
        
        // Add click listeners
        document.querySelectorAll('.genre-card').forEach(card => {
            card.addEventListener('click', () => {
                const genreId = card.dataset.id;
                const genreName = card.dataset.name;
                this.fetchMoviesByGenre(genreId, genreName);
            });
        });
    }

    showAutocomplete(movies) {
        if (movies.length === 0) {
            this.autocompleteBox.style.display = 'none';
            return;
        }

        const html = movies.map(movie => {
            const poster = movie.poster_path 
                ? `${this.IMAGE_BASE}${movie.poster_path}`
                : 'https://via.placeholder.com/50x75?text=No+Poster';
            
            return `
                <div class="autocomplete-item" data-id="${movie.id}">
                    <img src="${poster}" alt="${movie.title}">
                    <div class="movie-info">
                        <div class="movie-title">${movie.title}</div>
                        <div class="movie-year">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.autocompleteBox.innerHTML = html;
        this.autocompleteBox.style.display = 'block';

        // Add click listeners
        document.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const movieId = item.dataset.id;
                this.fetchMovieDetails(movieId);
                this.movieModal.style.display = 'block';
                this.autocompleteBox.style.display = 'none';
                this.searchInput.value = '';
            });
        });
    }

    showMovieDetails(movie) {
        this.modalTitle.textContent = movie.title;
        
        const poster = movie.poster_path 
            ? `${this.IMAGE_BASE}${movie.poster_path}`
            : 'https://via.placeholder.com/300x450?text=No+Poster';
        
        const genres = movie.genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('');
        
        const cast = movie.credits.cast.slice(0, 6).map(actor => `
            <div class="cast-item">
                <img src="${actor.profile_path ? this.IMAGE_BASE + actor.profile_path : 'https://via.placeholder.com/80x80?text=No+Image'}" alt="${actor.name}">
                <div>${actor.name}</div>
            </div>
        `).join('');
        
        const trailer = movie.videos.results.find(v => v.type === 'Trailer');
        const trailerHtml = trailer 
            ? `<a href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" class="btn-secondary" style="margin-top: 10px;"><i class="fab fa-youtube"></i> Watch Trailer</a>`
            : '';
        
        // Get reviews for this movie
        const movieReviews = this.reviews[movie.id] || [];
        const reviewsHtml = movieReviews.length > 0 ? `
            <div class="reviews-section">
                <h4>User Reviews</h4>
                ${movieReviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(10-review.rating)}</span>
                            <span>${new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        <div class="review-text">${review.text || 'No comment'}</div>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        this.modalBody.innerHTML = `
            <div class="movie-details">
                <div class="detail-poster">
                    <img src="${poster}" alt="${movie.title}">
                </div>
                <div class="detail-info">
                    <p><strong>Release Date:</strong> ${movie.release_date}</p>
                    <p><strong>Runtime:</strong> ${movie.runtime} minutes</p>
                    <p><strong>Rating:</strong> ${movie.vote_average}/10 (${movie.vote_count} votes)</p>
                    
                    <div class="genres">
                        ${genres}
                    </div>
                    
                    <h4>Overview</h4>
                    <p class="overview">${movie.overview}</p>
                    
                    ${trailerHtml}
                    
                    <h4>Cast</h4>
                    <div class="cast-grid">
                        ${cast}
                    </div>
                    
                    ${reviewsHtml}
                </div>
            </div>
        `;
        
        // Update watchlist button
        if (this.watchlist.includes(movie.id)) {
            this.addToWatchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i> Remove from Watchlist';
        } else {
            this.addToWatchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i> Add to Watchlist';
        }
    }

    getRatingClass(rating) {
        if (rating >= 7) return 'rating-high';
        if (rating >= 5) return 'rating-medium';
        return 'rating-low';
    }

    // Watchlist Functions
    toggleWatchlist() {
        if (!this.currentMovie) return;
        
        const movieId = this.currentMovie.id;
        
        if (this.watchlist.includes(movieId)) {
            this.watchlist = this.watchlist.filter(id => id !== movieId);
            this.addToWatchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i> Add to Watchlist';
        } else {
            this.watchlist.push(movieId);
            this.addToWatchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i> Remove from Watchlist';
        }
        
        localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
        
        // Refresh current tab if on watchlist
        if (this.currentTab === 'watchlist') {
            this.displayWatchlist();
        }
    }

    // Rating Functions
    openRatingModal() {
        if (!this.currentMovie) return;
        this.ratingModal.style.display = 'block';
        this.selectedRating = 0;
        this.resetStars();
        document.getElementById('reviewText').value = '';
    }

    highlightStars(rating, permanent = false) {
        document.querySelectorAll('.rating-stars i').forEach(star => {
            const starRating = parseInt(star.dataset.rating);
            if (starRating <= rating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });
    }

    resetStars() {
        if (this.selectedRating) {
            this.highlightStars(this.selectedRating, true);
        } else {
            document.querySelectorAll('.rating-stars i').forEach(star => {
                star.className = 'far fa-star';
            });
        }
    }

    submitUserRating() {
        if (!this.currentMovie || !this.selectedRating) {
            alert('Please select a rating');
            return;
        }
        
        const reviewText = document.getElementById('reviewText').value;
        const movieId = this.currentMovie.id;
        
        if (!this.reviews[movieId]) {
            this.reviews[movieId] = [];
        }
        
        this.reviews[movieId].push({
            rating: this.selectedRating,
            text: reviewText,
            date: new Date().toISOString()
        });
        
        localStorage.setItem('movieReviews', JSON.stringify(this.reviews));
        
        this.ratingModal.style.display = 'none';
        this.showMovieDetails(this.currentMovie); // Refresh details to show review
    }

    // UI Helpers
    showLoading() {
        this.mainContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading amazing movies...</div>';
    }

    showError(message) {
        this.mainContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle" style="color: #dc3545;"></i>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">Try Again</button>
            </div>
        `;
    }

    closeModals() {
        this.movieModal.style.display = 'none';
        this.ratingModal.style.display = 'none';
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovieDatabase();
});