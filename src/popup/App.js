import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/Settings';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import SearchIcon from '@mui/icons-material/Search';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

import './App.css';
import {getProviderFromUrl} from "../lib/provider";
import {getServerForType} from "../lib/server";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const borderStyles = {
  borderRadius: '16px', 
  boxShadow: 2, 
  border: 1, 
  // borderBottom: 1,
  // borderRight: 1,
  borderColor: 'grey.500',
  bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#101010' : '#fff'),
  m: 2,
  p: 1,
};

export default function App() {
  // const [value, setValue] = React.useState("sonarr");
  const [errorText, setErrorText] = React.useState("")
  const [server, setServer] = React.useState(null)

  const servername="sonarr"
  const serverlogo="/img/sonarr/sonarr-32.png"
  const serverurl="http://192.168.0.199:8989"
  const itemposter="https://image.tmdb.org/t/p/original/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg"
  const itemsynopsis="Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, Paul endeavors to prevent a terrible future only he can foresee."
  const itemtitle="Dune: Part Two"
  const itemyear="2024"

  // const handleChange = (event) => {
  //   setAge(event.target.value);
  // };

  function getCurrentTabUrl(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
        var tab = tabs[0];
        var url = tab.url;

        callback(url);
    });
}
 
  async function getItemInfo(provider, targetUrl, setServer) {
    // Find item id and type from the url to get the server that can handle this item
    const item = await  provider.itemFromUrl(targetUrl)
    const server = getServerForType(item.itemtype);
    console.log(`Found: ${item.itemid}, type: ${item.itemtype}, server: ${server.name}`);
    server.loadConfig(()=>{
      setServer(server);
      if (! server.enabled) { throw Error("Server not enabled, make sure to configure it.");}

      // Querying the item id to get info
      server.lookupItem(item.itemid).then( (founditem) => {
        console.log("Found item: " + founditem);      
      })
    })

}

  React.useEffect(() => {
    getCurrentTabUrl((targetUrl) => {
      // console.log("tab url " + targetUrl);
      const provider = getProviderFromUrl(targetUrl);
      if (provider) {
        getItemInfo(provider, targetUrl, setServer).then((iteminfo) => {
        // provider.itemFromUrl(targetUrl).then((item) => {
        //   const server = getServerForType(item.itemtype);
        //   console.log(`Found: ${item.itemid}, type: ${item.itemtype}, server: ${server.name}`);

        //   // lookup item to get info
        //   server.loadConfig((items) => { setServer(new_server);});

        //   const founditem = server.lookupItem(item.itemid);
          console.log("Found item: " + iteminfo);
          // update ui and remove loading tab
        }).catch((error) => {
          console.error("Couldn't get item info: " + error);
          setErrorText("Couldn't extract item information");
      })
      }
      else {
        console.error("No provider found matching url " + targetUrl);
        setErrorText("Website not supported");
      }
    });
    // if (!server) {
    //   const new_server = new Server(name, default_port);
    //   new_server.loadConfig((items) => { setServer(new_server);});
    // }
  }, [])

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
        <Card id="App" sx={{ display: 'flex', flexDirection: 'column' }}>

        {/* Loading... */}

        {/* <ItemHeader server={server}></CardHeader> */}
        <Typography component="div" variant="h5" sx={{ display: 'flex', flexDirection: 'row', p: 1 }}>
          <Box sx={{ display: 'flex'}}>
            <a id="card-header" href={serverurl}><img src={serverlogo}/></a>
          </Box>
          <Box sx={{ display: 'flex', pl: 1}}>
            {`Add to ${servername}`}
          </Box>
        </Typography>
        {errorText && (
            <Box sx={{ display: 'flex', pl: 1}}>
              <Typography variant="caption" display="block" gutterBottom className="errorText">
                {errorText}
              </Typography>
          </Box>)}
          
        {/* <ItemContent item={item}></ItemContent> */}
        <Box sx={{ ...borderStyles, display: 'flex', flexDirection: 'row'}}>
          <CardMedia
            component="img"
            sx={{ display: 'flex', width: 100, height: 150 }}
            image={itemposter}
            alt={`Poster for ${itemtitle}`}
          />

          <CardContent>
            <Typography component="div" variant="h6" sx={{ display: 'flex'}}>
              {itemtitle}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" component="div" sx={{ display: 'flex'}}>
            {`(${itemyear})`}
            </Typography>
            <Typography className='truncText' variant="caption" color="text.secondary" component="div" sx={{ 
              display: 'flex',
              height: 55,
              }} >
            {`(${itemsynopsis})`}
            </Typography>
          </CardContent>
        </Box>
  
        <Box sx={{ ...borderStyles, display: 'flex', flexDirection: 'column', mt: 0, mb: 0}}>
        <FormGroup>
          <FormControlLabel control={<Switch defaultChecked />} label="Monitored" />

          {/* For movies only */}
          <FormControl sx={{ m: 1}} size="small">
            <InputLabel id="min-label">Min Avail</InputLabel>
            <Select
              labelId="min-label"
              id="min-labelid"
              value={1}
              // label="Age"
              // onChange={handleChange}
            >
              <MenuItem value={1}>Announced</MenuItem>
              <MenuItem value={2}>In Cinemas</MenuItem>
              <MenuItem value={3}>Physical/Web</MenuItem>
              <MenuItem value={4}>Pre DB</MenuItem>
            </Select>
          </FormControl>

          {/* For series only */}
          <FormControl sx={{ m: 1}} size="small">
            <InputLabel id="serietype-label">Serie type</InputLabel>
            <Select
              labelId="serietype-label"
              id="serietype-labelid"
              value={1}
              // label="Age"
              // onChange={handleChange}
            >
              <MenuItem value={1}>Standard</MenuItem>
              <MenuItem value={2}>Daily</MenuItem>
              <MenuItem value={3}>Anime</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ m: 1}} size="small">
            <InputLabel id="profile-label">Quality profile</InputLabel>
            <Select
              labelId="profile-label"
              id="profile-labelid"
              value={1}
              // label="Age"
              // onChange={handleChange}
            >
              <MenuItem value={1}>Any</MenuItem>
              <MenuItem value={2}>SD</MenuItem>
              <MenuItem value={3}>HD</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ m: 1}} size="small">
            <InputLabel id="folder-label">Folder</InputLabel>
            <Select
              labelId="folder-label"
              id="folder-labelid"
              value={1}
              // label="Age"
              // onChange={handleChange}
            >
              <MenuItem value={1}>Folder1</MenuItem>
              <MenuItem value={2}>Folder2</MenuItem>
            </Select>
          </FormControl>
          </FormGroup>
        </Box>

        <Box sx={{display: 'flex', flexDirection: 'row', mt: 0, justifyContent: 'space-between', m: 2, mt: 0, p: 0 }}>
          <IconButton aria-label="settings" onClick={() => {chrome.runtime.openOptionsPage()}}>
            <SettingsIcon />
          </IconButton>

          {/* <Button variant="outlined" href="#outlined-buttons" color="success">
            Already exists
          </Button> */}

          <IconButton aria-label="search">
            <SearchIcon />
          </IconButton>          
        </Box>

      </Card>
    </ThemeProvider>
  );
}

