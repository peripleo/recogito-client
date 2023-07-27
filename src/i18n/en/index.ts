import accountMenu from './account-menu.json';
import annotationCommon from './annotation-common.json';
import annotationImage from './annotation-image.json';
import annotationText from './annotation-text.json';
import authLogin from './auth-login.json';
import dashboardAccount from './dashboard-account.json';
import dashboardProjects from './dashboard-projects.json';
import error from './error.json';
import notifications from './notifications.json';
import projectCollaboration from './project-collaboration.json';
import projectHome from './project-home.json';
import projectSidedbar from './project-sidebar.json';

export default {
  'annotation-image': {...annotationCommon, ...annotationImage},
  'annotation-text': { ...annotationCommon, ...annotationText },
  'auth-login': authLogin,
  'dashboard-account': { ...dashboardAccount },
  'dashboard-projects': { ...dashboardProjects, ...notifications, ...accountMenu },
  'error': error,
  'project-collaboration': projectCollaboration,
  'project-home': projectHome,
  'project-sidebar': projectSidedbar
}