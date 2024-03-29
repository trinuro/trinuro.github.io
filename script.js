const projects = 
[
{
  id: 0,
  projectName: "Workshop Feedback Form",
  imageSrc: "./Resources/webpImages/Workshop feedback form screenshot.jpeg.webp",
  altText: "Workshop Feedback Screenshot",
  url: "https://codepen.io/froginacup/full/GRezrmx",
},
{
  id: 1,
  projectName: "Linus Torvalds Tribute Page",
  imageSrc: "./Resources/webpImages/Linus Torvalds Tribute Screenshot.jpeg.webp",
  altText: "Linus Torvalds Tribute Screenshot",
  url: "https://codepen.io/froginacup/full/VwRgPpz",
},
{
  id: 2,
  projectName: "Technical Documentation Page",
  imageSrc: "./Resources/webpImages/Documentation Graphics.png.webp",
  altText: "Techincal Documentation Page Screenshot",
  url: "https://codepen.io/froginacup/full/bGZzgWQ",
},
{
  id: 3,
  projectName: "Product Landing Page",
  imageSrc: "./Resources/webpImages/Product Landing Page Screenshot.png.webp",
  altText: "Product Landing Page Screenshot",
  url: "https://codepen.io/froginacup/full/eYXxgRN",
},
{
  id: 4,
  projectName: "HacktheBox Academy",
  imageSrc: "./Resources/webpImages/HTB Academy Screenshot.png.webp",
  altText: "HTB Academy Screenshot",
  url: "https://drive.google.com/file/d/1L6v3ZO0oeKK-bVdl53adjor6bEPrG-Xc/view?usp",
},
{
  id: 5,
  projectName: "First Version of Portfolio Website",
  imageSrc: "./Resources/webpImages/Portfolio Website Version 1.png.webp",
  altText: "Portfolio Website Version 1.png",
  url: "https://trinuro.github.io/personal_portfolio_ver_1/",
},
{
  id: 6,
  projectName: "Palindrome Checker",
  imageSrc: "./Resources/webpImages/Palindrome Checker.png.webp",
  altText: "Palindrome Checker Screenshot",
  url: "https://codepen.io/froginacup/full/vYMBORj",
},
{
  id: 7,
  projectName: "Roman Numeral Converter",
  imageSrc: "./Resources/webpImages/Roman Numeral Converter.png.webp",
  altText: "Roman Numeral Converter Screenshot",
  url: "https://codepen.io/froginacup/full/VwNZLBX",
},
{
  id: 8,
  projectName: "US Phone Number Checker",
  imageSrc: "./Resources/webpImages/US Phone Number Checker.png.webp",
  altText: "US Phone Number Checker Screenshot",
  url: "https://codepen.io/froginacup/full/KKYPpxw",
},
{
  id: 9,
  projectName: "Cash Register Project",
  imageSrc: "./Resources/webpImages/Cash Register Project Screenshot.png.webp",
  altText: "Cash Register Project Screenshot",
  url: "https://codepen.io/froginacup/full/VwNZLGX",
},
{
  id: 10,
  projectName: "Pokemon Search App",
  imageSrc: "./Resources/webpImages/Pokemon Search App Screenshot.png.webp",
  altText: "Pokemon Search App Screenshot",
  url: "https://codepen.io/froginacup/full/zYXOGmN",
},
];


const projectsContainer = document.querySelector(".projects-container");
const showAllButton = document.getElementById("show-others-button");
let showAllBoolean = false;
const showcaseProjectContainer = document.getElementById("showcase-project-container");
const showcaseGoLeftButton = document.getElementById("showcase-go-left");
const showcaseGoRightButton = document.getElementById("showcase-go-right");
const showcaseProjectSection = document.getElementById("showcase-one-project-section");
let currentProject;

// This is a toggle button to show all projects in the web page.
showAllButton.addEventListener("click", ()=>{
    showAllBoolean = !showAllBoolean;

    if(showAllBoolean){
        showAllButton.textContent = "Hide Projects";
        projects.forEach(({id, projectName, imageSrc, altText, url})=>{
            projectsContainer.innerHTML += `
            <div class="project">
                    <a href="${url}" target="_blank">
                        <img class="project-image" src="${imageSrc}" alt="${altText}" >
                        <div class="project-title-container">
                            <span class="project-selector"><</span>${projectName}<span class="project-selector">/></span>
                        </div>
                    </a>
            </div>
            `;
        })
        showcaseProjectSection.style.display = "none";
    }else{
        projectsContainer.innerHTML = "";
        showAllButton.textContent = "Show All";
        showcaseProjectSection.style.display = "flex";
        window.open("#projects", "_self"); // teleport to the top of project section
    }

})

// function to prefetch project images
const prefetchAdjacentProjects = (project) =>{
  // check if the next project id is in the projects bound
  if(project.id+1 < projects.length){
    const projectAfter = projects[project.id+1];
    fetch(projectAfter.imageSrc)
    .catch((error)=>console.log(error));
  }

  if(project.id-1 < projects.length){
    const projectBefore = projects[project.id-1];
    fetch(projectBefore.imageSrc)
    .catch((error)=>console.log(error));
  }

}

const showcaseAProject = (projectID) =>{
    currentProject = projects.find((project)=>project.id===projectID); // find current project
    showcaseProjectContainer.innerHTML = `
    <div>
        <a href="${currentProject.url}" target="_blank">
            <div class="project-showcase">
                <img src="${currentProject.imageSrc}" alt="${currentProject.altText}" class="project-showcase-image">
                <p>${currentProject.projectName}</p>
            </div>
        </a>
    </div>
    `;

    // Update buttons
    if(currentProject.id===projects.length-1){
      showcaseGoRightButton.style.cursor = "not-allowed";
      showcaseGoRightButton.style.opacity=0.5;
    } else if(currentProject.id===0){
      showcaseGoLeftButton.style.cursor = "not-allowed";
      showcaseGoLeftButton.style.opacity=0.5;
    } else{
      showcaseGoLeftButton.style.cursor = "pointer";
      showcaseGoLeftButton.style.opacity=1;         
      showcaseGoRightButton.style.cursor = "pointer";
      showcaseGoRightButton.style.opacity=1;    
    }

    //prefetch next image
    prefetchAdjacentProjects(currentProject);
};

showcaseAProject(projects.length-1);

showcaseGoLeftButton.addEventListener("click", ()=>{
  if(currentProject.id===0){
    return;
  }
  showcaseAProject(currentProject.id - 1);

});

showcaseGoRightButton.addEventListener("click", ()=>{
  if(currentProject.id===projects.length-1){
    return;
  }
  showcaseAProject(currentProject.id + 1);

});

