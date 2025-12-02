# Twake Calendar Frontend

![LOGO](public/calendar.svg)

![Application screenshot](public/screenshot.png)

## Goals

This project aims at service a Single Page Application allowing a user to interact with its calendar.

This frontend-only application will interact with:

- [esn-sabre](https://github.com/linagora/esn-sabre/) CalDAV + CardDAV server, tailor made for LINAGORA needs.
- [Twake Calendar side service](https://github.com/linagora/twake-calendar-side-service) that delivers additional backend features for Sabre.

It is meant as a drop in replacement of [esn-frontend-calendar](https://github.com/linagora/esn-frontend-calendar).

## Contributing

### Formating

We use [Prettier](https://prettier.io/) to keep code style consistent.  
A `.prettierrc` file is already included in the repo, so formatting rules are predefined.

Before committing, make sure you format your files either using your IDE Prettier extension or Prettier CLI.

## Running it

Requirement: node 24+

### Compile it and run it

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

### Run it with docker

After compiling the project with npm (see previous section) simply run:

```
docker build -t linagora/twake-calendar-front .
```

Then edit `.env.js` in order to match your configuration then run it with:

```
docker run -d \
  -v $PWD/.env.example.js:/usr/share/nginx/html/.env.js \
  -p 5000:80 \
  tcal-front
```

And then visit [https://localhost:5000](https://localhost:5000).

## Configuring it

### App grid

An applist is configurable in the public folder to setup the grid of app accessible within Twake Calendar.

1. Copy `public/appList.example.js` to `public/appList.js`
2. Place your app icons in `public/assets/images/svg/` directory
3. Configure each app with three fields:

- name: the app's name
- icon: the path to the app's icon (relative to public folder, e.g., `/assets/images/svg/app-chat.svg`)
- link: the app's link or URL

Example:

```js
var appList = [
  {
    name: "Chat",
    link: "/twake",
    icon: "/assets/images/svg/app-chat.svg",
  },
  {
    name: "Drive",
    link: "/drive",
    icon: "/assets/images/svg/app-drive.svg",
  },
  {
    name: "Mail",
    link: "/mail",
    icon: "/assets/images/svg/app-mail.svg",
  },
];
```

**Note**: `appList.js` is gitignored, so each environment can have its own configuration. The icon files in `public/assets/images/svg/` should be committed to the repository.

## Roadmap

The Minimum Viable Product involves all features currently used in production for **esn-frontend-calendar**.

It includes basic calendaring features and shared / delegated calendar capacity.

After completing the MVP which should be done ~Q1 2026 we will work on additional integrations (viso, drive), resources, tasks, and much more exciting features.

## Credits

Developed with <3 at [LINAGORA](https://linagora.com) !
