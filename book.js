import { Octokit } from "octokit";
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node/index.cjs';
import fs  from 'fs'

const supported_format = 'mobi';

async function isEmptyDir(path) {  
    try {
      const directory = await fs.opendir(path)
      const entry = await directory.read()
      await directory.close()

      return entry === null
    } catch (error) {
      return false
    }
}

function update_repository(repo_url, dst_dir){
    // if the directory doesn't exist or is empty, clone the reposotory
    let dst_exists = fs.existsSync(dst_dir)
    if (!dst_exists || (dst_exists && isEmptyDir(dst_dir))){
        git.clone({ fs, http, dst_dir, url: repo_url }).then(console.log)
    }
    // otherwise pull the reposotory
    else{
        git.pull({
            fs,
            http,
            dir: dst_dir,
            ref: 'main',
            singleBranch: true
          })
          console.log('done')
    }
}

async function get_files(owner, repo){
    const github_token = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({
        auth: github_token
    })
    const responses = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1', {
        owner: owner,
        repo: repo,
        tree_sha: 'master'
    })
    // console.log(responses)
    let files = responses.data.tree.map(({path}) => path);
    return files;
}

const groupBy = (input, key_func) => {
    return input.reduce((acc, currentValue) => {
      let groupKey = key_func(currentValue);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(currentValue);
      return acc;
    }, {});
  };

// group all files. It retruns a dictionary like
// {'economist': '2022.10.22/TheEconomist.2022.04.epub'}
function group_files(files) {
    //currently only support sending mobi files
    files = files.filter(path => path.split('/').length == 3 && path.includes(supported_format));
    // example: 02_new_yorker -> new_yorker
    let grouped = groupBy(files, path => path.split('/')[0].split('_').slice(1).join('_'))
    return grouped
}

function get_latest_in_group(group){
    let latest = {}
    for (const [k, v] of Object.entries(group)){
        v.sort();
        v.reverse();
        latest[k] = v[0];
    }
    return latest;
}

export async function get_latest_books(owner, repo){
    const files = await get_files(owner, repo);
    let grouped = group_files(files);
    let latest = get_latest_in_group(grouped);
    return latest
}


// test get files
const files = await get_files('hehonghui', 'awesome-english-ebooks');
console.log(files.length);
let grouped = group_files(files);
console.log(grouped);
let latest = get_latest_in_group(grouped);
console.log(latest);

