import React from 'react';
import { commitMutation, graphql } from 'react-relay';
import { FormattedMessage, defineMessages, injectIntl } from 'react-intl';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import ShortTextIcon from '@material-ui/icons/ShortText';
import LocationIcon from '@material-ui/icons/LocationOn';
import DateRangeIcon from '@material-ui/icons/DateRange';
import RadioButtonCheckedIcon from '@material-ui/icons/RadioButtonChecked';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import IconImageUpload from '@material-ui/icons/CloudUpload';
import ConfirmDialog from '../layout/ConfirmDialog';
import EditTaskDialog from '../task/EditTaskDialog';
import { RequiredIndicator } from '../task/Task';
import { getErrorMessage } from '../../helpers';
import environment from '../../CheckNetworkLayerModern';

const messages = defineMessages({
  editError: {
    id: 'createTeamTask.editError',
    defaultMessage: 'Failed to edit default task',
  },
  deleteError: {
    id: 'createTeamTask.deleteError',
    defaultMessage: 'Failed to delete default task',
  },
  menuTooltip: {
    id: 'createTeamTask.menuTooltip',
    defaultMessage: 'Task actions',
  },
});

class TeamTasksListItem extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      action: null,
      message: null,
      anchorEl: null,
      dialogOpen: false,
    };
  }

  fail = (transaction) => {
    const fallbackMessage = this.props.intl.formatMessage(messages.deleteError);
    const message = getErrorMessage(transaction, fallbackMessage);
    this.setState({ message });
  };

  handleMenuClick = (event) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleCloseMenu = () => {
    this.setState({ anchorEl: null });
  };

  handleMenuEdit = () => {
    this.setState({ isEditing: true, action: 'edit' });
    this.handleCloseMenu();
  };

  handleMenuDelete = () => {
    this.setState({ dialogOpen: true, action: 'delete' });
    this.handleCloseMenu();
  };

  handleConfirmDialog = () => {
    this.handleCloseDialog();
    if (this.state.action === 'delete') {
      this.handleDestroy();
    } else if (this.state.action === 'edit') {
      this.handleSubmitTask();
    }
  }

  handleEdit = (editedTask) => {
    this.setState({ isEditing: false, editedTask, dialogOpen: true });
  };

  handleDestroy = () => {
    const { task } = this.props;

    const mutation = graphql`
      mutation TeamTasksListItemModernDeleteMutation(
        $input: DestroyTeamTaskInput!
      ) {
        destroyTeamTask(input: $input) {
          deletedId
          team {
            id
            team_tasks(first: 10000) {
              edges {
                node {
                  id
                  dbid
                  label
                  description
                  options
                  type
                  project_ids
                  required
                  json_schema
                }
              }
            }
          }
        }
      }
    `;

    const optimisticResponse = {
      destroyTeamTask: {
        deletedId: task.id,
        team: {
          id: this.props.team.id,
        },
      },
    };

    commitMutation(
      environment,
      {
        mutation,
        optimisticResponse,
        variables: {
          input: {
            id: task.id,
          },
        },
        configs: [
          {
            type: 'NODE_DELETE',
            deletedIDFieldName: 'deletedId',
          },
          {
            type: 'RANGE_DELETE',
            parentID: this.props.team.id,
            pathToConnection: ['team', 'team_tasks'],
            connectionKeys: [{ key: 'Team_team_tasks' }],
            deletedIDFieldName: 'deletedId',
          },
        ],
        onError: err => this.fail(err),
      },
    );
  };

  handleCloseDialog = () => {
    this.setState({ dialogOpen: false, message: null });
  };

  handleCloseEdit = () => {
    this.setState({ action: null, isEditing: false, message: null });
  };

  handleSubmitTask = () => {
    const task = this.state.editedTask;
    const { id, type } = this.props.task;
    const variables = {
      input: {
        id,
        task_type: type,
        label: task.label,
        description: task.description,
        required: Boolean(task.required),
        json_options: task.jsonoptions,
        json_project_ids: task.json_project_ids,
        json_schema: task.jsonschema,
      },
    };

    const mutation = graphql`
      mutation TeamTasksListItemModernUpdateMutation(
        $input: UpdateTeamTaskInput!
      ) {
        updateTeamTask(input: $input) {
          team {
            id
            team_tasks(first: 10000) {
              edges {
                node {
                  id
                  dbid
                  label
                  description
                  options
                  type
                  project_ids
                  required
                  json_schema
                }
              }
            }
          }
        }
      }
    `;

    commitMutation(
      environment,
      {
        mutation,
        variables,
        onError: err => this.fail(err),
        onCompleted: () => {
          this.handleCloseEdit();
          this.setState({ editedTask: null });
        },
      },
    );
  };

  render() {
    const { team, task } = this.props;
    const projects = team ? team.projects.edges : null;
    const { anchorEl } = this.state;

    const icon = {
      free_text: <ShortTextIcon />,
      geolocation: <LocationIcon />,
      datetime: <DateRangeIcon />,
      single_choice: <RadioButtonCheckedIcon />,
      multiple_choice: <CheckBoxIcon style={{ transform: 'scale(1,1)' }} />,
      image_upload: <IconImageUpload />,
    };

    const label = (
      <span>
        {task.label}
        <RequiredIndicator required={task.required} />
      </span>
    );

    const confirmDialogTitle = {
      edit: <FormattedMessage
        id="teamTasks.confirmEditTitle"
        defaultMessage="Are you sure you want to edit this task?"
      />,
      delete: <FormattedMessage
        id="teamTasks.confirmDeleteTitle"
        defaultMessage="Are you sure you want to delete this task?"
      />,
    };

    const confirmDialogBlurb = {
      edit: <FormattedMessage
        id="teamTasks.confirmEditBlurb"
        defaultMessage="Related item tasks will be modified as a consequence of applying this change, except for those that have already been answered or resolved."
      />,
      delete: <FormattedMessage
        id="teamTasks.confirmDeleteBlurb"
        defaultMessage="Related item tasks will be deleted as a consequence of applying this change, except for those that have already been answered or resolved."
      />,
    };

    return (
      <div>
        <ListItem className="team-tasks__list-item">
          <ListItemIcon className="team-tasks__task-icon">
            {icon[task.type]}
          </ListItemIcon>
          <ListItemText className="team-tasks__task-label" primary={label} />
          <ListItemSecondaryAction>
            <Tooltip title={this.props.intl.formatMessage(messages.menuTooltip)}>
              <IconButton className="team-tasks__menu-item-button" onClick={this.handleMenuClick}>
                <MoreHorizIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={this.handleCloseMenu}
            >
              <MenuItem className="team-tasks__edit-button" onClick={this.handleMenuEdit}>
                <FormattedMessage id="teamTasks.edit" defaultMessage="Edit task" />
              </MenuItem>
              <MenuItem className="team-tasks__delete-button" onClick={this.handleMenuDelete}>
                <FormattedMessage id="teamTasks.delete" defaultMessage="Delete task" />
              </MenuItem>
            </Menu>
          </ListItemSecondaryAction>
        </ListItem>
        <ConfirmDialog
          open={this.state.dialogOpen}
          title={confirmDialogTitle[this.state.action]}
          blurb={confirmDialogBlurb[this.state.action]}
          handleClose={this.handleCloseDialog}
          handleConfirm={this.handleConfirmDialog}
          message={this.state.message}
        />
        { this.state.isEditing ?
          <EditTaskDialog
            task={task}
            message={this.state.message}
            taskType={task.type}
            onDismiss={this.handleCloseEdit}
            onSubmit={this.handleEdit}
            projects={projects}
          />
          : null
        }
      </div>
    );
  }
}

export default injectIntl(TeamTasksListItem);
