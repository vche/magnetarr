/* global chrome */

import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { Server } from '../lib/server';

function CustomTabPanel({ children, selected, name, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={selected !== name}
      id={`tabpanel-${name}`}
      aria-labelledby={`tab-${name}`}
      {...other}
    >
      {selected === name && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function tabProps(name) {
  return {
    id: `tab-${name}`,
    value: `${name}`,
    'aria-controls': `tabpanel-${name}`,
  };
}

function CliArrSettings( { name, default_port="0"} ) {
  const [server, setServer] = React.useState(null)
  const [invalidHost, setInvalidHost] = React.useState("")
  const [invalidPort, setInvalidPort] = React.useState("")
  const [invalidKey, setInvalidKey] = React.useState("")

  // Load config from settings for this server
  React.useEffect(() => {
    if (!server) {
      const wanted = {}
      const new_server = new Server(name, default_port);
      wanted[new_server.name] = new_server.getConfig()
      chrome.storage.sync.get(
        wanted,
          (items) => {
            new_server.setConfig(items[new_server.name]);
            setServer(new_server);
          }
      );
    }
  }, [server])

  // Validate the form, test config, and store the update
  function handleSubmit(event) {
      var validated = true;
      event.preventDefault();
      event.stopPropagation();

      if (!event.target.id_host.value.startsWith("http")) {
          setInvalidHost("Host must start with http or https"); validated = false
      }
      else {setInvalidHost(""); }
      if (isNaN(event.target.id_port.value)) {
          setInvalidPort("Port must be a number"); validated = false
      }
      else {setInvalidPort(""); }
      if (event.target.id_apikey.value.length < 3) {
        setInvalidKey("API Key cannot be empty"); validated = false
      }
      else {setInvalidKey(""); }

      if (validated){
        // Set the validated data
        server.host = event.target.id_host.value;
        server.port = event.target.id_port.value;
        server.apikey = event.target.id_apikey.value;
        server.user = event.target.id_user.value;
        server.password = event.target.id_pass.value;
        
        // server.get("/api/v3/system/status")
        // server.enabled

        const wanted = {}
        wanted[server.name] = server.getConfig();

        chrome.storage.sync.set(
          wanted,
          () => {
            // Update status to let user know options were saved.
            console.log("trop fort " + server.name + ": ")
            // const status = document.getElementById('status');
            // status.textContent = 'Options saved.';
            // setTimeout(() => {
            //   status.textContent = '';
            // }, 750);
          }
        );        
      }
   };

  return (
      <div>
          {server && (
            <form onSubmit={handleSubmit}>
                <TextField id="id_host"
                    label="Host"
                    variant="outlined"
                    margin="normal" 
                    fullWidth
                    autoComplete="host"
                    error={invalidHost?true:false}
                    helperText={invalidHost}
                    defaultValue={server.host}
                />
                <TextField id="id_port" 
                    label="Port"
                    variant="outlined"
                    margin="normal" 
                    fullWidth
                    autoComplete="port"
                    error={invalidPort?true:false}
                    helperText={invalidPort}
                    defaultValue={server.port}
                />
                <TextField id="id_apikey" 
                    label="API key"
                    variant="outlined"
                    margin="normal" 
                    fullWidth
                    autoComplete="key"
                    error={invalidKey?true:false}
                    helperText={invalidKey}
                    defaultValue={server.apikey}
                />

                <TextField id="id_user" 
                    label="User"
                    variant="outlined"
                    margin="normal" 
                    fullWidth
                    autoComplete="username"
                    helperText="Leave empty if no authentication"
                    defaultValue={server.user}
                />
                <TextField id="id_pass" 
                    label="Password"
                    variant="outlined"
                    margin="normal" 
                    type="password"
                    fullWidth
                    autoComplete="current-password"
                    helperText="Leave empty if no authentication"
                    defaultValue={server.password}
                />

                <Button type="submit" >
                    Apply
                </Button>
            </form>
        )}
      </div>
  )
}

export default function ExtensionSettings() {
  const [value, setValue] = React.useState("sonarr");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label="Sonarr" {...tabProps("sonarr")} />
          <Tab label="Radarr" {...tabProps("radarr")} />
        </Tabs>
      </Box>
      <CustomTabPanel selected={value} name="sonarr">
        <CliArrSettings name="sonarr" default_port="8989"/>
      </CustomTabPanel>
      <CustomTabPanel selected={value} name="radarr">
        <CliArrSettings name="radarr" default_port="7878"/>
      </CustomTabPanel>
    </Box>
  );
}