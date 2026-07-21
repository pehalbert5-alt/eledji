window.addEventListener('DOMContentLoaded', () => {
  const splashScreen = document.getElementById('splash');
  const appMain = document.getElementById('app');
  const startBtn = document.getElementById('start-btn');
  const registrationForm = document.getElementById('registration-form');
  const profilePicInput = document.getElementById('profile-pic-input');
  const profilePicPreview = document.getElementById('profile-pic-preview');
  const registrationContainer = document.querySelector('.registration-container');
  const googleSignInBtn = document.getElementById('google-signin-btn');
  const mainContent = document.getElementById('main-content');
  const bottomNav = document.getElementById('bottom-nav');

  // --- Configuration Firebase ---
  const firebaseConfig = {
    apiKey: "AIzaSyDcaR2kG-jwP-aS0ZaFtQ0ukMsGjCEjHq0",
    authDomain: "eledji-f6c36.firebaseapp.com",
    projectId: "eledji-f6c36",
    storageBucket: "eledji-f6c36.appspot.com",
    messagingSenderId: "630119432286",
    appId: "1:630119432286:web:d535b3518e4eff535f34cf",
    measurementId: "G-WW9M2DDRG3"
  };

  // Initialiser Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const storage = firebase.storage();
  const db = firebase.firestore();

  // --- Gestion de l'état d'authentification ---
  auth.onAuthStateChanged((user) => {
    if (user) {
      // L'utilisateur est connecté. On affiche directement son profil.
      console.log("Utilisateur déjà connecté:", user.displayName);
      splashScreen?.classList.add('hidden'); // Cacher l'écran de bienvenue
      appMain?.classList.remove('hidden'); // Afficher la zone principale
      showUserProfile(user);
    } else {
      // L'utilisateur n'est pas connecté.
      // L'application continue normalement, en affichant l'écran de bienvenue.
      console.log("Aucun utilisateur connecté.");
    }
  });

  /**
   * Affiche la vue du profil de l'utilisateur et cache le formulaire.
   * @param {firebase.User} user - L'objet utilisateur de Firebase.
   */
  const showUserProfile = (user) => {
    // Cacher le formulaire d'inscription
    appMain.style.alignItems = 'flex-start'; // Aligne le contenu en haut
    registrationContainer?.classList.add('hidden');

    // Injecter le profil dans la vue "Compte"
    const accountView = document.getElementById('account-view');
    if (accountView) {
      accountView.innerHTML = `
        <div class="profile-view">
          <img src="${user.photoURL || 'https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_120dp.png'}" alt="Photo de profil de ${user.displayName}">
          <h2>Bienvenue, ${user.displayName} !</h2>
          <button id="logout-btn" class="logout-btn">Se déconnecter</button>
        </div>
      `;

      // Gérer la déconnexion
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            await auth.signOut();
            console.log('Utilisateur déconnecté.');
            // Recharger la page pour revenir à l'écran d'accueil
            location.reload();
          } catch (error) {
            console.error('Erreur de déconnexion:', error);
          }
        });
      }
    }

    // Afficher le contenu principal et la navigation
    mainContent.classList.remove('hidden');
    bottomNav?.classList.remove('hidden');
    navigateTo('account-view'); // Afficher la vue du compte par défaut
  };

  /**
   * Gère la navigation entre les vues.
   * @param {string} viewId L'ID de la vue à afficher.
   */
  const navigateTo = (viewId) => {
    // Cacher toutes les vues
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    // Afficher la vue sélectionnée
    document.getElementById(viewId)?.classList.remove('hidden');

    // Mettre à jour l'état actif des boutons de navigation
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      if (btn.dataset.view === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  // Fonction pour afficher l'application
  const showApp = () => {
    if (splashScreen) {
      splashScreen.classList.add('hidden'); // Cacher l'écran de bienvenue
      appMain.classList.remove('hidden'); // Afficher la zone principale
    }
  };

  // Si l'utilisateur clique sur le bouton, on affiche l'app tout de suite
  startBtn?.addEventListener('click', showApp);

  // Ajouter les écouteurs d'événements pour la navigation
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
    });
  });

  // Gérer l'ouverture et la fermeture du modal '+'
  const addBtn = document.querySelector('.add-btn');
  const addModal = document.getElementById('add-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');

  const toggleModal = () => addModal?.classList.toggle('hidden');

  if (addBtn && addModal) {
    addBtn.addEventListener('click', toggleModal);
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', toggleModal);
  }
  // Fermer le modal en cliquant sur l'arrière-plan
  addModal?.addEventListener('click', (e) => e.target === addModal && toggleModal());

  // Gérer l'aperçu de la photo de profil
  if (profilePicInput && profilePicPreview) {
    profilePicInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        profilePicPreview.src = URL.createObjectURL(file);
      }
    });
  }

  // Gérer la soumission du formulaire d'inscription
  if (registrationForm) {
    registrationForm.addEventListener('submit', async (event) => {
      event.preventDefault(); // Empêche le rechargement de la page
      
      const username = registrationForm.querySelector('#username').value;
      const profilePicFile = profilePicInput.files[0];

      try {
        // 1. Connecter l'utilisateur de manière anonyme
        const userCredential = await auth.signInAnonymously();
        const user = userCredential.user;

        let photoURL = null;

        // 2. Si une image est fournie, la téléverser sur Firebase Storage
        if (profilePicFile) {
          const storageRef = storage.ref(`profile_pictures/${user.uid}`);
          const uploadTask = await storageRef.put(profilePicFile);
          photoURL = await uploadTask.ref.getDownloadURL();
        }

        // 3. Mettre à jour le profil avec le nom d'utilisateur et la photo
        await user.updateProfile({
          displayName: username,
          photoURL: photoURL
        });

        // 4. Créer un document utilisateur dans Firestore
        await db.collection('users').doc(user.uid).set({
          uid: user.uid,
          displayName: username,
          photoURL: photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Utilisateur créé et profil mis à jour:', user);
        showUserProfile(user);
      } catch (error) {
        console.error("Erreur lors de la création du compte:", error);
        alert(`Erreur : ${error.message}`);
      }
    });
  }

  // Gérer la connexion avec Google
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        console.log('Utilisateur connecté avec Google:', user);

        // Si c'est un nouvel utilisateur, créer son document dans Firestore
        if (result.additionalUserInfo.isNewUser) {
          await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        showUserProfile(user);
      } catch (error) {
        console.error("Erreur lors de la connexion avec Google:", error);
        alert(`Erreur : ${error.message}`);
      }
    });
  }

});