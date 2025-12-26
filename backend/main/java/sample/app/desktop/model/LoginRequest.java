package sample.app.desktop.model;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String password;
}
