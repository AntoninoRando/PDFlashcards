import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import ProfileView from "../views/ProfileView.vue";
import SearchView from "../views/SearchView.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/login",
    },
    {
      path: "/login",
      component: LoginView,
    },
    {
      path: "/home",
      component: HomeView,
    },
    {
      path: "/search",
      component: SearchView,
    },
    {
      path: "/users/:userId",
      component: ProfileView,
    },
    {
      path: "/:catchAll(.*)",
      redirect: localStorage.getItem("token") ? "/home" : "/login",
    },
  ],
});

export default router;
